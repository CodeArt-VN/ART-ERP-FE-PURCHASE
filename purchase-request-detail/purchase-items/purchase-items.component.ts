import { ChangeDetectorRef, Component, DoCheck, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { HistoryService } from 'src/app/services/custom/history.service';
import { PROD_ItemInVendorProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { IntervalItemModalComponent } from '../interval-item-modal/interval-item-modal';
import { lib } from 'src/app/services/static/global-functions';

@Component({ selector: 'app-purchase-items', templateUrl: './purchase-items.component.html', styleUrls: ['./purchase-items.component.scss'], standalone: false })
export class PurchaseItemsComponent extends PageBase implements DoCheck {
	private _historyViewIndex = -1;
	_preloadItems;
	_canEdit = false;
	_IDPurchaseRequest;
	_IDVendor = '';
	_contentType = 'Item';
	_showStatus = false;
	_status = '';
	_statusLineList = [];

	@Input() page: any;
	@Input() set contentType(value) {
		this._contentType = value;
	}
	@Input() set IDPurchaseRequest(value) {
		this._IDPurchaseRequest = value;
		this.formGroup.get('IDPurchaseRequest').setValue(value);
	}

	@Input() set canEdit(value) {
		this._canEdit = value;
	}

	@Input() set IDVendor(value: any) {
		this._IDVendor = value;
	}

	@Input() set status(value: any) {
		this._status = value;
	}

	@Input() set statusLineList(value: any) {
		this._statusLineList = value;
	}

	@Input() set orderLines(value: any) {
		this.items = value;
		this.setOrderLines();
	}

	@Output() onChange = new EventEmitter<any>();
	@Output() renderFormArray = new EventEmitter<any>();
	@Output() removeItem = new EventEmitter<any>();

	constructor(
		public pageProvider: PROD_ItemInVendorProvider,
		public itemProvider: WMS_ItemProvider,
		public historyService: HistoryService,
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
		this.formGroup = this.formBuilder.group({ IDPurchaseRequest: [''], OrderLines: this.formBuilder.array([]) });
	}

	loadData() {
		this.items = [];
		super.loadedData();
	}

	setOrderLines() {
		this.formGroup.controls.OrderLines = new FormArray([]);
		if (this.items?.length) {
			var showStatusLines = ['Approved', 'Closed', 'QuotationSent'];
			this._showStatus = showStatusLines.includes(this._status);
		}
		this.items?.forEach((i) => {
			this.addLine(i);
		});
		if (this.page?.pageConfig?.isHistoryView) {
			(this.formGroup.controls.OrderLines as FormArray).controls.forEach((g) =>
				g.enable({ emitEvent: false })
			);
		} else {
			if (this.page?.pageConfig?.canEditPurchaseRequest != undefined) {
				this.page.pageConfig.canEdit = this.page.pageConfig.canEditPurchaseRequest;
			}
			if (!this.page?.pageConfig?.canEdit) this.formGroup.disable();
		}

		this.renderFormArray.emit(this.formGroup.controls.OrderLines);
	}

	ngDoCheck() {
		if (!this.page) return;

		if (!this.page.pageConfig?.isHistoryView) {
			if (this._historyViewIndex !== -1) {
				this._historyViewIndex = -1;
				const lines = this.page.item?.OrderLines;
				this.items = Array.isArray(lines) ? [...lines] : [];
				this.setOrderLines();
				this.cdr.detectChanges();
			}
			return;
		}

		const rev = this.page.historyRevision ?? this.page.historyIndex;
		if (rev === this._historyViewIndex) return;
		this._historyViewIndex = rev;
		const lines = this.page.item?.OrderLines;
		this.items = Array.isArray(lines) ? [...lines] : [];
		this.setOrderLines();
		this.cdr.detectChanges();
	}

	/** Live line `_Item` + history-preloaded bag (deleted lines). */
	resolveSelectedItem(line: any): any {
		if (line?._Item?.Id) return line._Item;
		const id = Number(line?.IDItem);
		if (!(id > 0)) return null;
		const bag = this.page?.historySnapshotBefore?._Items || [];
		return bag.find((d) => d.Id == id) || null;
	}

	addLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.OrderLines;
		let selectedItem = this.resolveSelectedItem(line);
		line.Status = line.Status ?? 'Open';
		// Detail API no longer returns full UoMs/_Vendors — seed display-only values; edit data via ItemPrices
		const seedUoMs =
			selectedItem?.UoMs?.length > 0
				? selectedItem.UoMs
				: line.IDItemUoM
					? [{ Id: line.IDItemUoM, Name: line.UoMName || selectedItem?.UoMs?.find((u) => u.Id == line.IDItemUoM)?.Name || `#${line.IDItemUoM}`, IsBaseUoM: line.IDBaseUoM == line.IDItemUoM, PriceList: [] }]
					: [];
		const seedVendors =
			selectedItem?._Vendors?.length > 0
				? selectedItem._Vendors
				: selectedItem?._Vendor?.Id
					? [selectedItem._Vendor]
					: [];
		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.pageProvider.commonService.connect('GET', 'PURCHASE/Request/ItemSearch/',{
					// IsVendorSearch: this._IDVendor ? true : false,
					IDVendor: this._IDVendor,
					IDPO: line.IDOrder,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Keyword: term
				});
			}),
			_IDUoMDataSource: [seedUoMs],
			_Vendors: [seedVendors],
			_Vendor: [seedVendors.find((d) => d.Id == line.IDVendor) || selectedItem?._Vendor || ''],
			IDItem: [line.IDItem || 0],
			IDRequest: [line.IDRequest || this._IDPurchaseRequest], //Validators.required
			IDItemUoM: new FormControl(
				line.IDItemUoM,
				this._contentType === 'Item' ? Validators.required : null // Conditional validator
			),
			IDBaseUoM: [line.IDBaseUoM],
			IDVendor: [this._IDVendor ? this._IDVendor : line.IDVendor],
			Id: [line.Id],
			_historyLineKey: [line._historyLineKey || (Number(line.Id) > 0 ? String(line.Id) : '')],
			_historyRemoved: [!!line._historyRemoved],
			_historyTrackKey: [`${this.page?.historyRevision ?? 0}:${line._historyRemoved ? 'rm:' : ''}${line._historyLineKey || line.Id || groups.length}`],
			Status: [line.Status],
			Sort: [line.Sort],
			Name: [line.Name],
			Remark: [line.Remark],
			RequiredDate: [line.RequiredDate], //,Validators.required
			UoMPrice: [line.UoMPrice],
			UoMName: [line.UoMName],
			Quantity: new FormControl(
				line.Quantity,
				this._contentType === 'Item' ? Validators.required : null // Conditional validator
			),
			QuantityRemainingOpen: new FormControl({ value: line.QuantityRemainingOpen, disabled: true }),
			UoMSwap: [line.UoMSwap],
			UoMSwapAlter: [line.UoMSwapAlter],
			IDTax: [line.IDTax], //,Validators.required
			TaxRate: new FormControl({ value: line.TaxRate, disabled: true }),

			TotalAfterTax: [line.TotalAfterTax],

			TotalBeforeDiscount: [line.TotalBeforeDiscount],

			TotalDiscount: [line.TotalDiscount],

			TotalAfterDiscount: [line.TotalAfterDiscount],
			_Item: [selectedItem || line._Item],
			Tax: new FormControl({ value: line.Tax, disabled: true }),
			IsDeleted: [line.IsDeleted],
			CreatedBy: [line.CreatedBy],
			ModifiedBy: [line.ModifiedBy],
			CreatedDate: [line.CreatedDate],
			_Status: [this._statusLineList.find((d) => d.Code == line.Status)],
		});
		groups.push(group);
		if (selectedItem) {
			const ds = group.get('_IDItemDataSource').value;
			if (ds && !ds.selected?.some((x) => x?.Id == selectedItem.Id)) {
				ds.selected = [...(ds.selected || []), selectedItem];
			}
		}
		group.get('_IDItemDataSource').value?.initSearch();

		if (markAsDirty) {
			group.get('IDVendor').markAsDirty();
			group.get('Status').markAsDirty();
		}
	}

	removeLine(index) {
		let groups = <FormArray>this.formGroup.controls.OrderLines;
		if (groups.controls[index].get('Id').value) {
			this.env
				.showPrompt('Are you sure you want to delete the product?', null, 'Delete the product')
				.then((_) => {
					let Ids = [];
					Ids.push(groups.controls[index].get('Id').value);
					this.removeItem.emit(Ids);
				})
				.catch((_) => {});
		} else groups.removeAt(index);
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
					var baseUoM = e.UoMs.find((d) => d.IsBaseUoM);
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
		let idUoM = group.controls.IDItemUoM.value;

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
					let baseUOM = UoMs.find((d) => d.IsBaseUoM);
					if (baseUOM) {
						group.controls.IDBaseUoM.setValue(baseUOM.Id);
						group.controls.IDBaseUoM.markAsDirty();
					}
					group.controls.UoMPrice.setValue(priceBeforeTax);
					group.controls.UoMPrice.markAsDirty();

					this.submitData(group);
					return;
				}
			}
			this.submitData(group);
		} else {
			group.controls.UoMPrice.setValue(null);
			group.controls.UoMPrice.markAsDirty();
			group.controls.IDBaseUoM.setValue(null);
			group.controls.IDBaseUoM.markAsDirty();
			this.submitData(group);
		}
	}

	changeLineVendor(g) {
		const idItem = g.get('IDItem')?.value;
		const idVendor = g.get('IDVendor')?.value || this._IDVendor;
		if (!idItem) {
			this.submitData(g);
			return;
		}

		this.pageProvider.commonService
			.connect('POST', 'PURCHASE/Request/ItemPrices', {
				Lines: [{ IDItem: idItem, IDVendor: idVendor || 0 }],
			})
			.toPromise()
			.then((prices: any) => {
				const row = prices?.[0];
				if (row) {
					const uoms = row.UoMs || [];
					const vendors = row._Vendors || [];
					g.get('_IDUoMDataSource')?.setValue(uoms);
					g.get('_Vendors')?.setValue(vendors);
					g.get('_Vendor')?.setValue(vendors.find((v) => v.Id == idVendor) || null);
					const item = g.get('_Item')?.value;
					if (item) {
						g.get('_Item')?.setValue({
							...item,
							UoMs: uoms,
							_Vendors: vendors,
						});
					}
					this.IDUoMChange(g);
					return;
				}
				this.submitData(g);
			})
			.catch(() => this.submitData(g));
	}

	submitData(g) {
		if (!g.valid) {
			let invalidControls = super.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				let invalidControlsTranslated = values;
				this.env.showMessage('Please recheck control(s): {{value}}', 'warning', invalidControlsTranslated.join(' | '));
			});
			g._Vendor = g.controls._Vendors?.value?.find((d) => d.Id == g.controls.IDVendor.value);
		} else {
			this.onChange.emit();
		}
	}

	calcTotalDiscount() {
		return this.formGroup.controls.OrderLines.getRawValue()
			.map((x) => x.TotalDiscount)
			.reduce((a, b) => +a + +b, 0);
	}
	calcTotalAfterTax() {
		return this.formGroup.controls.OrderLines.getRawValue()
			.map((x) => (x.UoMPrice * x.Quantity - x.TotalDiscount) * (1 + x.TaxRate / 100))
			.reduce((a, b) => +a + +b, 0);
	}

	changeQuantity(g) {
		g.get('QuantityRemainingOpen').setValue(g.get('Quantity').value);
		g.get('QuantityRemainingOpen').markAsDirty();
		this.submitData(g);
	}

	onCellChange(e: { row: any; property: string }) {
		if (e?.property === 'Quantity') {
			this.changeQuantity(e.row);
			return;
		}
		this.submitData(e.row);
	}

	async openFilterItemByBranch() {
		const modal = await this.modalController.create({
			component: IntervalItemModalComponent,
			componentProps: {
				IDPurchaseRequest: this._IDPurchaseRequest,
				RequiredDate: this.page?.formGroup?.get('RequiredDate')?.value ?? null,
			},
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data) {
			this.page?.refresh?.();
		}
	}
}
