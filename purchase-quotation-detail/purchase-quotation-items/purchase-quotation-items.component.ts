import { ChangeDetectorRef, Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { PROD_ItemInVendorProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-purchase-quotation-items',
	templateUrl: './purchase-quotation-items.component.html',
	styleUrls: ['./purchase-quotation-items.component.scss'],
	standalone: false,
})
export class PurchaseQuotationItemsComponent extends PageBase {
	_IDPurchaseQuotation;
	_IDVendor = '';
	_contentType = 'Item';
	_statusLineList = [];
	_vendorDataSource;
	_sourceType;

	@Input() page;
	@Input() vendorView = false;
	@Input() isShowtoggleAllQuantity = true;

	@Input() set contentType(value) {
		this._contentType = value;
	}
	@Input() set IDPurchaseQuotation(value) {
		this._IDPurchaseQuotation = value;
		this.formGroup.get('IDPurchaseQuotation').setValue(value);
	}

	@Input() set IDVendor(value: any) {
		this._IDVendor = value;
		this.formGroup.get('IDBusinessPartner').setValue(value);
	}

	@Input() set statusLineList(value: any) {
		this._statusLineList = value;
	}

	@Input() set orderLines(value: any) {
		this.items = value;
		this.setOrderLines();
	}

	@Input() set vendorDataSource(value) {
		this._vendorDataSource = value;
	}

	@Input() set sourceType(value) {
		this._sourceType = value;
	}

	@Input() set requiredDate(value) {
		this.formGroup.get('RequiredDate').setValue(value);
	}

	@Output() onChange = new EventEmitter<any>();
	@Output() onRefresh = new EventEmitter<any>();
	@Output() renderFormArray = new EventEmitter<any>();
	@Output() removeItem = new EventEmitter<any>();
	@Output() confirmEvent = new EventEmitter<void>();

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
			IDPurchaseQuotation: [''],
			IDBusinessPartner: [''],
			RequiredDate: [''],
			OrderLines: this.formBuilder.array([]),
		});
		this.pageConfig.canViewPriceListVersion = true;
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
		const selectedItem = line._Item;
		line.Status = line.Status ?? 'Open';

		const group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.pageProvider.commonService.connect('GET', 'PURCHASE/Quotation/ItemSearch/', {
					IDVendor: this._IDVendor,
					IDQuotation: line.IDQuotation,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Term: term,
				});
			}),
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],

			IDItem: new FormControl({ value: line.IDItem, disabled: this?._sourceType != null }, this._contentType === 'Item' ? [Validators.required] : []),
			IDItemUoM: new FormControl({ value: line.IDItemUoM, disabled: this?._sourceType != null }, this._contentType === 'Item' ? [Validators.required] : []),

			Id: [line.Id],
			IDQuotation: [line.IDQuotation || this._IDPurchaseQuotation],
			Status: [line.Status],
			Sort: [line.Sort],
			Name: [line.Name, this._contentType === 'Service' ? Validators.required : null],
			Remark: [line.Remark],
			RequiredDate: new FormControl({ value: line.RequiredDate, disabled: this?._sourceType != null }),

			Price: [line.Price],
			UoMName: [line.UoMName],

			IDVendor: [this._IDVendor ? this._IDVendor : line.IDVendor || ''],

			Quantity: new FormControl(line.Quantity, this._contentType === 'Item' ? Validators.required : null),
			MinimumOrderQty: [line?.MinimumOrderQty],
			QuantityRemainingOpen: new FormControl({ value: line.QuantityRemainingOpen, disabled: true }),
			QuantityRequired: new FormControl({ value: line.QuantityRequired, disabled: this?._sourceType != null }, Validators.required),

			UoMSwap: [line.UoMSwap],
			UoMSwapAlter: [line.UoMSwapAlter],
			IDBaseUoM: [line.IDBaseUoM],
			IDTax: [line.IDTax],
			TaxRate: new FormControl({ value: line.TaxRate, disabled: this?._sourceType != null }),
			TotalBeforeDiscount: [line.TotalBeforeDiscount],
			TotalDiscount: [line.TotalDiscount],
			TotalAfterDiscount: [line.TotalAfterDiscount],
			TotalAfterTax: [line.TotalAfterTax],
			_Item: [line._Item],
			Tax: new FormControl({ value: line.Tax, disabled: true }),
			IsDeleted: [line.IsDeleted],
			CreatedBy: [line.CreatedBy],
			ModifiedBy: [line.ModifiedBy],
			CreatedDate: [line.CreatedDate],
			DeletedLines: [],
			_Status: [this._statusLineList.find((d) => d.Code == line.Status)],
			_Vendors: [],
			IsChecked: [false],
		});

		groups.push(group);

		if (selectedItem) group.get('_IDItemDataSource').value.selected.push(selectedItem);
		group.get('_IDItemDataSource').value?.initSearch();

		if (markAsDirty) {
			group.get('IDVendor').markAsDirty();
			group.get('Status').markAsDirty();
		}
	}

	IDItemChange(e, group) {
		if (e) {
			if (e.PurchaseTaxInPercent != -99) {
				group.controls._IDUoMDataSource.setValue(e.UoMs);
				group.controls.IDTax.setValue(e.IDPurchaseTaxDefinition);
				group.controls.IDTax.markAsDirty();
				if (e.UoMs?.length > 0) {
					group.controls.IDItemUoM.setValue(e.PurchasingUoM);
					group.controls.IDItemUoM.markAsDirty();
					const baseUoM = e.UoMs.find((d) => d.IsBaseUoM);
					if (baseUoM) {
						group.controls.IDBaseUoM.setValue(baseUoM.Id);
						group.controls.IDItemUoM.markAsDirty();
					}
				}
				group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
				group.controls.TaxRate.markAsDirty();
				group.controls._Item.setValue(e._Item);

				if (!e._Vendors?.some((o) => o.Id == group.get('IDVendor').value)) {
					group.get('IDVendor').setValue(null);
					group.get('IDVendor').markAsDirty();
				}
				group.controls._Vendors.setValue(e._Vendors);

				this.IDUoMChange(group);
				return;
			} else {
				this.env.showMessage('The item has not been set tax');
			}
		}
	}

	IDUoMChange(group) {
		const idUoM = group.controls.IDItemUoM.value;
		if (idUoM) {
			const UoMs = group.controls._IDUoMDataSource.value;
			const u = UoMs.find((d) => d.Id == idUoM);
			if (u && u.PriceList) {
				const p = u.PriceList.find((d) => d.Type == 'PriceListForVendor');
				let taxRate = group.controls.TaxRate.value;
				if (p && taxRate != null) {
					if (taxRate < 0) taxRate = 0;
					const priceBeforeTax = p.IsTaxIncluded ? p.Price / (1 + taxRate / 100) : p.Price;

					const baseUOM = UoMs.find((d) => d.IsBaseUoM);
					if (baseUOM) {
						group.controls.IDBaseUoM.setValue(baseUOM.Id);
						group.controls.IDBaseUoM.markAsDirty();
					}

					group.controls.Price.setValue(priceBeforeTax);
					group.controls.Price.markAsDirty();

					this.submitData(group);
					return;
				}
			}
		} else {
			group.controls.Price.setValue(null);
			group.controls.Price.markAsDirty();
			group.controls.IDBaseUoM.setValue(null);
			group.controls.IDBaseUoM.markAsDirty();
		}
	}

	submitData(g) {
		if (!g.valid) {
			const invalidControls = super.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				this.env.showMessage('Please recheck control(s): {{value}}', 'warning', values.join(' | '));
			});
			g._Vendor = g.controls._Vendors?.value?.find((d) => d.Id == g.controls.IDVendor.value);
		} else {
			this.onChange.emit();
		}
	}

	changeQuantity(g) {
		g.get('QuantityRemainingOpen').setValue(g.get('Quantity').value);
		g.get('QuantityRemainingOpen').markAsDirty();
		this.submitData(g);
	}

	confirm() {
		this.confirmEvent.emit();
	}

	toggleAllQuantity() {
		const groups = this.formGroup.controls.OrderLines as FormArray;
		if (!groups) return;

		const allFilled = groups.controls.every((g) => g.get('Quantity')?.value === g.get('QuantityRequired')?.value);

		groups.controls.forEach((g) => {
			const req = g.get('QuantityRequired')?.value || 0;
			const quantityCtrl = g.get('Quantity');
			if (quantityCtrl?.disabled) return;
			quantityCtrl.setValue(allFilled ? 0 : req);
			quantityCtrl.markAsDirty();
		});
		this.onChange.emit();
	}

	toggleQuantity(g: FormGroup) {
		if (!g) return;
		const req = g.get('QuantityRequired')?.value || 0;
		const quantityCtrl = g.get('Quantity');
		if (!quantityCtrl || quantityCtrl.disabled) return;

		quantityCtrl.setValue(quantityCtrl.value === req ? 0 : req);
		quantityCtrl.markAsDirty();
		this.onChange.emit();
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
		if (!this.formGroup?.controls?.QuotationLines || !this.page) return;
		const groups = this.formGroup.controls.QuotationLines as FormArray;

		if (!this.page.pageConfig.canEdit) {
			this.formGroup.disable();
		}

		// canQuote - có thể báo giá (edit price, quantity, TotalDiscount)
		if (['Open', 'Unapproved'].includes(this.page.item.Status) && this.page.pageConfig.canQuote && !this.page.pageConfig.canEdit) {
			groups.controls.forEach((c) => {
				c.get('MinimumOrderQty')?.enable();
				c.get('Price')?.enable();
				c.get('Quantity')?.enable();
				c.get('TotalDiscount')?.enable();
				c.get('IsDiscontinued')?.enable();
			});
		}

		groups.controls.forEach((group) => {
			const g = group as FormGroup;
			if (g.controls.Quantity?.disabled) {
				this.page._isShowtoggleAllQuantity = false;
			}
			if (g.controls.IsDiscontinued?.value) {
				group.get('Price')?.clearValidators();
				group.get('Price')?.disable();
			}
		});
	}
	isOpenPriceListVersionPopover: boolean = false;
	currentShowingPriceListVersionItem: any;
	popoverSpinner = false;
	@ViewChild('priceListVersionPopover') priceListVersionPopover!: HTMLIonPopoverElement;
	OpenViewPriceListVersionPopover(i) {
		this.isOpenPriceListVersionPopover = !this.isOpenPriceListVersionPopover;
		if (this.isOpenPriceListVersionPopover) {
			if (!i.PriceListVersion) {
				this.currentShowingPriceListVersionItem = null;
				let queryPriceListVersion = {
					IDItemUoM: i.get('IDItemUoM').value,
					IDVendor: this.formGroup.controls.IDBusinessPartner.value,
				};
				this.popoverSpinner = true;
				this.itemProvider.commonService
					.connect('GET', 'WMS/Item/GetItemPriceListVersion', queryPriceListVersion)
					.toPromise()
					.then((x) => {
						if (x) {
							i.PriceListVersion = x;
							this.currentShowingPriceListVersionItem = i.PriceListVersion;
						}
					})
					.finally(() => {
						this.popoverSpinner = false;
					});
			}
		}
	}

	_isOpenAddAllProductFromVendor = false;
	formGroupQuantityProduct;
	openAllProductFromVendorPopover() {
		if (!this.formGroup.get('IDBusinessPartner')?.value) return;
		this.env
			.showPrompt({
				code: 'Do you want to add all products from vendor {value}?',
				value: this._vendorDataSource.selected.find((d) => d.Id == this.formGroup.controls.IDBusinessPartner.value),
			})
			.then((_) => {
				this.formGroupQuantityProduct = this.formBuilder.group({
					Quantity: ['', Validators.required],
				});
				this._isOpenAddAllProductFromVendor = true;
			})
			.catch((_) => {});
	}
	addAllProductFromVendor(check) {
		if (check) {
			let postDTO = {
				Id: this._IDPurchaseQuotation,
				IDVendor: this._IDVendor,
				QuantityRequired: this.formGroupQuantityProduct.controls.Quantity.value,
				RequiredDate: this.formGroup.controls.RequiredDate.value,
			};
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/AddAllProductFromVendor', postDTO).toPromise())
				.then((rs) => {
					if (rs) {
						this.onRefresh.emit();
					} else {
						this.env.showMessage('Failed', 'danger');
					}
				});
		}
		this._isOpenAddAllProductFromVendor = false;
	}
}
