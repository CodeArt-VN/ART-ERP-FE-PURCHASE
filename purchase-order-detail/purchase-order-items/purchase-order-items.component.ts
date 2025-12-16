import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { PROD_ItemInVendorProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-purchase-order-items',
	templateUrl: './purchase-order-items.component.html',
	styleUrls: ['./purchase-order-items.component.scss'],
	standalone: false,
})
export class PurchaseOrderItemsComponent extends PageBase {
	@Input() page: any;
	@Input() set _item(value: any) {
		this.item = value;
	}
	@Input() set orderLines(value: any[]) {
		this.items = value;
		this.setOrderLines();
	}
	@Input() set _status(value) {
		this.formGroup.get('Status').setValue(value);
	}
	@Input() vendorView = false;
	@Output() onChange = new EventEmitter<any>();
	@Output() removeItem = new EventEmitter<any>();
	@Output() renderFormArray = new EventEmitter<any>();
	@Output() onShowSaleOrder = new EventEmitter<any>();
	@Output() onConfirmOrder = new EventEmitter<any>();

	constructor(
		public pageProvider: PROD_ItemInVendorProvider,
		public itemProvider: WMS_ItemProvider,
		public env: EnvService,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public modalController: ModalController,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.formGroup = this.formBuilder.group({
			IDPurchaseOrder: [''],
			Status: [''],
			OrderLines: this.formBuilder.array([]),
		});
	}

	loadData() {
		this.items = [];
		super.loadedData();
	}

	setOrderLines() {
		this.formGroup.controls.OrderLines = new FormArray([]);
		this.items?.forEach((i) => this.addLine(i));
		this.updateFormPermissions();
		this.renderFormArray.emit(this.formGroup.controls.OrderLines);
	}

	addLine(line, markAsDirty = false) {
		const groups = this.formGroup.controls.OrderLines as FormArray;
		line.Status = line.Status ?? 'Open';
		let preLoadItems = this.item._Items;
		let selectedItem = preLoadItems?.find((d) => d.Id == line.IDItem);
		const group = this.formBuilder.group({
			_IDItemDataSource: [
				{
					searchProvider: this.itemProvider,
					loading: false,
					input$: new Subject<string>(),
					selected: preLoadItems,
					items$: null,
					initSearch() {
						this.loading = false;
						this.items$ = concat(
							of(this.selected),
							this.input$.pipe(
								distinctUntilChanged(),
								tap(() => (this.loading = true)),
								switchMap((term) =>
									this.searchProvider.search({ ARSearch: true, IDPO: line.IDOrder, SortBy: ['Id_desc'], Take: 20, Skip: 0, Keyword: term }).pipe(
										catchError(() => of([])), // empty list on error
										tap(() => (this.loading = false))
									)
								)
							)
						);
					},
				},
			],
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],
			IDOrder: [line.IDOrder],
			Id: [line.Id],
			Remark: new FormControl({
				value: line.Remark,
				disabled: !(this.page.pageConfig.canEdit || ((this.item.Status == 'Approved' || this.item.Status == 'Ordered') && this.page.pageConfig.canEditApprovedOrder)),
			}),
			IDItem: [line.IDItem, Validators.required],
			IDUoM: new FormControl({ value: line.IDUoM, disabled: false }, Validators.required),
			UoMPrice: new FormControl({ value: line.UoMPrice, disabled: !(this.page.pageConfig.canEdit && this.page.pageConfig.canEditPrice) }, Validators.required),
			SuggestedQuantity: new FormControl({ value: line.SuggestedQuantity, disabled: true }),
			UoMQuantityExpected: new FormControl({ value: line.UoMQuantityExpected, disabled: false }, Validators.required),
			QuantityAdjusted: new FormControl({
				value: line.QuantityAdjusted,
				disabled: !((this.item.Status == 'Approved' || this.item.Status == 'Ordered') && this.page.pageConfig.canEditApprovedOrder),
			}),
			IsPromotionItem: new FormControl({ value: line.IsPromotionItem, disabled: false }),
			TotalBeforeDiscount: new FormControl({ value: line.TotalBeforeDiscount, disabled: true }),
			TotalDiscount: new FormControl({ value: line.TotalDiscount, disabled: false }),
			TotalAfterDiscount: new FormControl({ value: line.TotalAfterDiscount, disabled: true }),
			TaxRate: new FormControl({ value: line.TaxRate, disabled: true }),
			Tax: new FormControl({ value: line.Tax, disabled: true }),
			TotalAfterTax: new FormControl({ value: line.TotalAfterTax, disabled: true }),
			IsChecked: [false],
		});

		groups.push(group);

		if (selectedItem) group.get('_IDItemDataSource').value.selected.push(selectedItem);
		group.get('_IDItemDataSource').value?.initSearch();

		if (markAsDirty) {
			group.get('IDOrder').markAsDirty();
		}
	}

	IDItemChange(e, group) {
		if (e) {
			if (e.PurchaseTaxInPercent && e.PurchaseTaxInPercent != -99) {
				group.controls._IDUoMDataSource.setValue(e.UoMs);

				group.controls.IDUoM.setValue(e.PurchasingUoM);
				group.controls.IDUoM.markAsDirty();

				group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
				group.controls.TaxRate.markAsDirty();

				this.IDUoMChange(group);
				return;
			}

			if (e.PurchaseTaxInPercent != -99) this.env.showMessage('The item has not been set tax');
		}

		group.controls.TaxRate.setValue(null);
		group.controls.TaxRate.markAsDirty();

		group.controls.IDUoM.setValue(null);
		group.controls.IDUoM.markAsDirty();

		group.controls.UoMPrice.setValue(null);
		group.controls.UoMPrice.markAsDirty();
	}

	IDUoMChange(group) {
		let idUoM = group.controls.IDUoM.value;

		if (idUoM) {
			let UoMs = group.controls._IDUoMDataSource.value;
			let u = UoMs.find((d) => d.Id == idUoM);
			if (u && u.PriceList) {
				let p = u.PriceList.find((d) => d.Type == 'PriceListForVendor');
				let taxRate = group.controls.TaxRate.value;
				if (p && taxRate != null) {
					let priceBeforeTax = null;

					if (taxRate < 0) taxRate = 0; //(-1 || -2) In case goods are not taxed

					if (p.IsTaxIncluded) {
						priceBeforeTax = p.Price / (1 + taxRate / 100);
					} else {
						priceBeforeTax = p.Price;
					}

					group.controls.UoMPrice.setValue(priceBeforeTax);
					group.controls.UoMPrice.markAsDirty();

					this.submitData(group);
					return;
				}
			}
		}
		group.controls.UoMPrice.setValue(null);
		group.controls.UoMPrice.markAsDirty();
	}

	submitData(g) {
		if (!g.valid) {
			const invalidControls = super.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				this.env.showMessage('Please recheck control(s): {{value}}', 'warning', values.join(' | '));
			});
		} else {
			this.onChange.emit();
		}
	}

	changeSelection(i, e = null) {
		if (i.get('IsChecked').value) {
			this.selectedOrderLines.push(i);
		} else {
			let index = this.selectedOrderLines.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
			this.selectedOrderLines.removeAt(index);
		}
		i.get('IsChecked').markAsPristine();
	}

	isAllChecked = false;
	selectedOrderLines = new FormArray([]);
	toggleSelectAll() {
		this.isAllChecked = !this.isAllChecked;
		if (!this.page.pageConfig.canEdit) return;
		let groups = <FormArray>this.formGroup.controls.OrderLines;
		if (!this.isAllChecked) {
			this.selectedOrderLines = new FormArray([]);
		}
		groups.controls.forEach((i) => {
			i.get('IsChecked').setValue(this.isAllChecked);
			i.get('IsChecked').markAsPristine();

			if (this.isAllChecked) this.selectedOrderLines.push(i);
		});
	}
	removeLine(index) {
		const groups = this.formGroup.controls.OrderLines as FormArray;
		if (groups.controls[index].get('Id').value) {
			this.env
				.showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
				.then(() => {
					const Ids = [groups.controls[index].get('Id').value];
					this.removeItem.emit(Ids);
				})
				.catch(() => {});
		} else {
			groups.removeAt(index);
		}
	}

	removeSelectedItems() {
		let groups = <FormArray>this.formGroup.controls.OrderLines;

		if (this.selectedOrderLines.controls.length === 0) {
			this.env.showMessage('Please select at least one item to remove', 'warning');
			return;
		}

		if (this.selectedOrderLines.controls.some((g) => g.get('Id').value)) {
			this.env
				.showPrompt({ code: 'ACTION_DELETE_MESSAGE', value: { value: this.selectedOrderLines.length } }, null, {
					code: 'ACTION_DELETE_MESSAGE',
					value: { value: this.selectedOrderLines.length },
				})
				.then((_) => {
					let itemsWithId = this.selectedOrderLines.controls.map((fg) => fg.get('Id').value).filter((id) => id);

					if (itemsWithId.length > 0) {
						this.removeItem.emit(itemsWithId);
					}

					this.selectedOrderLines.controls.forEach((selectedItem) => {
						const selectedId = selectedItem.get('Id').value;
						const index = groups.controls.findIndex((control) => control.get('Id').value === selectedId);
						if (index >= 0) {
							groups.removeAt(index);
						}
					});

					this.selectedOrderLines = new FormArray([]);
					this.isAllChecked = false;
				})
				.catch((_) => {});
		} else {
			this.selectedOrderLines.controls
				.map((fg) => fg.get('Id').value)
				.forEach((id) => {
					let index = groups.controls.findIndex((x) => x.get('Id').value == id);
					if (index >= 0) groups.removeAt(index);
				});
			this.selectedOrderLines = new FormArray([]);
			this.isAllChecked = false;
		}
	}

	updateFormPermissions() {
		if(this.page.pageConfig.canEditPurchaseOrder != undefined) {
			this.page.pageConfig.canEdit = this.page.pageConfig.canEditPurchaseOrder;
		}
		const groups = this.formGroup.controls.OrderLines as FormArray;
		if (!this.page.pageConfig?.canEdit) {
			this.formGroup.disable();
		}
		if (this.page.pageConfig?.canEditApprovedOrder && (this.item?.Status == 'Approved' || this.item?.Status == 'Ordered')) {
			groups.controls.forEach((g) => {
				g.get('QuantityAdjusted').enable();
				g.get('Remark').enable();
			});
		}
	}
	showSaleOrderPickerModal() {
		this.onShowSaleOrder.emit();
	}

	confirmOrder() {
		this.onConfirmOrder.emit();
	}
	
}
