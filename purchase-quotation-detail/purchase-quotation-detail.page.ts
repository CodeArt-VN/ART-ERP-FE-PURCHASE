import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BRA_BranchProvider,
	CRM_ContactProvider,
	HRM_StaffProvider,
	PURCHASE_QuotationDetailProvider,
	SYS_ConfigProvider,
	WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { CopyFromPurchaseQuotationToPurchaseOrder } from '../copy-from-purchase-quotation-to-purchase-order-modal/copy-from-purchase-quotation-to-purchase-order-modal.page';
import { PriceListVersionModalPage } from '../pricelist-version-modal/pricelist-version-modal.page';
import { PURCHASE_QuotationService } from '../purchase-quotation.service';

@Component({
	selector: 'app-purchase-quotation-detail',
	templateUrl: './purchase-quotation-detail.page.html',
	styleUrls: ['./purchase-quotation-detail.page.scss'],
	standalone: false,
})
export class PurchaseQuotationDetailPage extends PageBase {
	@ViewChild('importfile') importfile: any;
	checkingCanEdit = false;
	statusList = [];
	_statusLineList = [];
	contentTypeList = [];
	vendorView = false;
	markAsPristine = false;
	_currentVendor;
	_isVendorSearch = false;
	_isShowtoggleAllQuantity = true;
	_vendorDataSource = this.buildSelectDataSource((term) => {
		return this.contactProvider.search({ SkipAddress: true, IsVendor: true, SortBy: ['Id_desc'], Take: 20, Skip: 0, Term: term });
	});

	_staffDataSource = this.buildSelectDataSource((term) => {
		return this.staffProvider.search({ Take: 20, Skip: 0, Term: term });
	});

	constructor(
		public pageProvider: PURCHASE_QuotationService,
		public purchaseQuotationDetailProvider: PURCHASE_QuotationDetailProvider,
		public contactProvider: CRM_ContactProvider,
		public branchProvider: BRA_BranchProvider,
		public itemProvider: WMS_ItemProvider,
		public popoverCtrl: PopoverController,
		public sysConfigProvider: SYS_ConfigProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		public commonService: CommonService,
		public staffProvider: HRM_StaffProvider
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.buildFormGroup();
		if (this.env.user.IDBusinessPartner > 0 && !this.env.user.SysRoles.includes('STAFF') && this.env.user.SysRoles.includes('VENDOR')) {
			this.vendorView = true;
		}
	}
	buildFormGroup() {
		this.formGroup = this.formBuilder.group({
			IDBranch: [this.env.selectedBranch, Validators.required],
			IDRequester: [''],
			IDRequestBranch: [''],
			IDBusinessPartner: [null, Validators.required],
			SourceKey: new FormControl({ value: '', disabled: true }),
			SourceType: new FormControl({ value: '', disabled: true }),
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
			ForeignName: [''],
			Remark: [''],
			ForeignRemark: [''],
			ContentType: ['Item', Validators.required],
			Status: new FormControl({ value: 'Draft', disabled: true }, Validators.required),
			RequiredDate: ['', Validators.required],
			ValidUntilDate: ['', Validators.required],

			PostingDate: [''],
			DueDate: [''],
			DocumentDate: [''],

			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),

			QuotationLines: this.formBuilder.array([]),
			TotalDiscount: new FormControl({ value: '', disabled: true }),
			TotalAfterTax: new FormControl({ value: '', disabled: true }),
			DeletedLines: [''],
		});
	}
	preLoadData(event) {
		this.checkingCanEdit = this.pageConfig.canEdit;
		this.contentTypeList = [
			{ Code: 'Item', Name: 'Items' },
			{ Code: 'Service', Name: 'Service' },
		];
		let sysConfigQuery = ['PQUsedApprovalModule'];
		Promise.all([
			this.env.getStatus('PurchaseQuotation'),
			this.contactProvider.read({ IsVendor: true, Take: 20 }),
			this.env.getStatus('PurchaseQuotationLine'),
			this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch }),
		]).then((values: any) => {
			if (values[0]) this.statusList = values[0];
			if (values[1] && values[1].data) {
				this._vendorDataSource.selected.push(...values[1].data);
			}
			if (values[2]) this._statusLineList = values[2];
			values[3]['data'].forEach((e) => {
				if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
					e.Value = e._InheritedConfig.Value;
				}
				this.pageConfig[e.Code] = JSON.parse(e.Value);
			});
			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.pageConfig.canEdit = this.checkingCanEdit;
		this.isAllChecked = true;
		this.buildFormGroup();
		if (!['Open', 'Draft', 'Unapproved'].includes(this.item.Status)) this.pageConfig.canEdit = false;
		if (this.item.Status == 'Confirmed' && this.vendorView) this.pageConfig.canEdit = false;
		if (this.pageConfig['PQUsedApprovalModule']) {
			this.pageConfig['canApprove'] = false;
		}
		super.loadedData(event);
		this.setQuotationLines();
		this.toggleSelectAll();

		if (this.item.SourceType == 'FromPurchaseRequest') {
			this.formGroup.controls.ContentType.disable();
			this.formGroup.controls.IDBusinessPartner.disable();
			this.formGroup.controls.RequiredDate.disable();
			this.formGroup.controls.DocumentDate.disable();
			this.formGroup.controls.PostingDate.disable();
			this.formGroup.controls.DueDate.disable();
			let enableValid = ['Submitted', 'Approved', 'Closed', 'Canceled', 'Confirmed'];
			if (!enableValid.includes(this.item.Status)) {
				this.formGroup.controls.ValidUntilDate.enable();
			}
		}

		if (this.item._Vendor) {
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, ...[this.item._Vendor]];
		}
		this._vendorDataSource.initSearch();
		if (this.vendorView && this.item.Status == 'Open') this.pageConfig.ShowConfirm = true;
		else this.pageConfig.ShowConfirm = false;

		// Quyền canQuote có thể báo giá (edit price, quantity,TotalDiscount)
		if (['Open', 'Unapproved'].includes(this.item.Status) && this.pageConfig.canQuote && !this.pageConfig.canEdit) {
			let groups = this.formGroup.controls.QuotationLines as FormArray;
			groups.controls.forEach((c) => {
				c.get('Price').enable();
				c.get('Quantity').enable();
				c.get('TotalDiscount').enable();
			});
		}

		if (this.item?.Id == 0) this.formGroup.controls.ContentType.markAsDirty();
		this._currentContentType = this.item.ContentType;
		let groups = <FormArray>this.formGroup.controls.QuotationLines;
		groups.controls.forEach((group) => {
			let g = <FormGroup>group;
			if (g.controls.Quantity.disabled) this._isShowtoggleAllQuantity = false;
			return;
		});
	}

	async saveChange() {
		return super.saveChange2();
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}
	changeDate(e) {
		if (!this.formGroup.get('DocumentDate').value) {
			this.formGroup.get('DocumentDate').setValue(e.target.value);
			this.formGroup.get('DocumentDate').markAsDirty();
		}
		if (!this.formGroup.get('PostingDate').value) {
			this.formGroup.get('PostingDate').setValue(e.target.value);
			this.formGroup.get('PostingDate').markAsDirty();
		}
		if (!this.formGroup.get('DueDate').value) {
			this.formGroup.get('DueDate').setValue(e.target.value);
			this.formGroup.get('DueDate').markAsDirty();
		}
		this.saveChange();
	}
	changeRequiredDate() {
		let orderLines = this.formGroup.get('OrderLines') as FormArray;
		orderLines?.controls.forEach((o) => {
			if (!o.get('RequiredDate').value) {
				o.get('RequiredDate').setValue(this.formGroup.get('RequiredDate').value);
				o.get('RequiredDate').markAsDirty();
			}
		});
		this.saveChange();
	}

	changeVendor(e) {
		let quotationLines = this.formGroup.get('QuotationLines') as FormArray;
		if (quotationLines?.controls.length > 0) {
			if (e) {
				this.env
					.showPrompt('Tất cả hàng hoá trong danh sách khác với nhà cung cấp được chọn sẽ bị xoá. Bạn có muốn tiếp tục ? ', null, 'Thông báo')
					.then(() => {
						let DeletedLines = quotationLines
							.getRawValue()
							.filter((f) => f.Id && f.IDVendor != e.Id && !f._Vendors?.map((v) => v.Id)?.includes(e.Id))
							.map((o) => o.Id);
						this.formGroup.get('DeletedLines').setValue(DeletedLines);
						this.formGroup.get('DeletedLines').markAsDirty();

						this._currentVendor = e;
						this.saveChange();
					})
					.catch(() => {
						this.formGroup.get('IDVendor').setValue(this._currentVendor?.Id);
					});
			} else {
				this._currentVendor = e;
				this.saveChange();
			}
		} else {
			this._currentVendor = e;
			this.saveChange();
		}
	}

	setQuotationLines() {
		this.formGroup.controls.QuotationLines = new FormArray([]);
		if (this.item?.QuotationLines?.length)
			this.item?.QuotationLines.forEach((i) => {
				this.addLine(i);
			});
		if (!this.pageConfig.canEdit) {
			this.formGroup.controls.QuotationLines.disable();
		}
	}

	addLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.QuotationLines;
		let selectedItem = line._Item;
		line.Status = line.Status || 'Open';
		let group = this.formBuilder.group({
			_IDItemDataSource: this.buildSelectDataSource((term) => {
				return this.itemProvider.search({
					IsVendorSearch: this.item.IDBusinessPartner ? true : false,
					IDVendor: this.item.IDBusinessPartner,
					IDPO: line.IDOrder,
					SortBy: ['Id_desc'],
					Take: 20,
					Skip: 0,
					Term: term,
				});
			}),
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],
			IDItem: new FormControl({ value: line.IDItem, disabled: this.item?.SourceType != null }, this.item?.ContentType === 'Item' ? [Validators.required] : []), //Validators.required
			IDItemUoM: new FormControl({ value: line.IDItemUoM, disabled: this.item?.SourceType != null }, this.item?.ContentType === 'Item' ? [Validators.required] : []),
			Id: [line.Id],
			Status: [line.Status],
			Sort: [line.Sort],
			Name: [line.Name, this.item?.ContentType == 'Service' ? Validators.required : null],
			Remark: [line.Remark],
			RequiredDate: new FormControl({ value: line.RequiredDate, disabled: this.item?.SourceType != null }), //,Validators.required
			Price: [line.Price, this.vendorView ? Validators.required : null],
			UoMName: [line.UoMName],
			IDVendor: [line.IDVendor || ''],
			Quantity: new FormControl(
				line.Quantity,
				this.item.ContentType === 'Item' && this.vendorView ? Validators.required : null // Conditional validator
			),
			QuantityRemainingOpen: new FormControl({ value: line.QuantityRemainingOpen, disabled: true }),
			QuantityRequired: new FormControl({ value: line.QuantityRequired, disabled: this.item?.SourceType != null }, Validators.required),
			UoMSwap: [line.UoMSwap],
			UoMSwapAlter: [line.UoMSwapAlter],
			IDTax: [line.IDTax], //,Validators.required
			TaxRate: new FormControl({ value: line.TaxRate, disabled: this.item?.SourceType != null }),

			TotalAfterTax: [line.TotalAfterTax],

			TotalBeforeDiscount: [line.TotalBeforeDiscount],

			TotalDiscount: [line.TotalDiscount],

			TotalAfterDiscount: [line.TotalAfterDiscount],
			_Item: [line._Item],
			Tax: new FormControl({ value: line.Tax, disabled: true }),
			IsDeleted: [line.IsDeleted],
			CreatedBy: [line.CreatedBy],
			ModifiedBy: [line.ModifiedBy],
			CreatedDate: [line.CreatedDate],
			DeletedLines: [],
			_Status: [this._statusLineList.find((d) => d.Code == line.Status)],
			_Vendors:[],
			IsChecked:  [false],

		});
		groups.push(group);
		if (selectedItem) group.get('_IDItemDataSource').value.selected.push(selectedItem);
		group.get('_IDItemDataSource').value?.initSearch();

		if (markAsDirty) {
			group.get('Status').markAsDirty();
		}
	}

	removeLine(index) {
		let groups = <FormArray>this.formGroup.controls.QuotationLines;
		let group = groups.controls[index];
		if (group.get('Id').value) {
			this.env
				.showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
				.then((_) => {
					let Ids = [];
					Ids.push(groups.controls[index].get('Id').value);
					// this.removeItem.emit(Ids);
					if (Ids && Ids.length > 0) {
						this.formGroup.get('DeletedLines').setValue(Ids);
						this.formGroup.get('DeletedLines').markAsDirty();
						//this.item.DeletedLines = Ids;
						this.saveChange().then((_) => {
							Ids.forEach((id) => {
								let index = groups.controls.findIndex((x) => x.get('Id').value == id);
								if (index >= 0) groups.removeAt(index);
							});
						});
					}
				})
				.catch((_) => {});
		} else groups.removeAt(index);
	}

	calcTotalAfterTax() {
		if (this.formGroup.get('QuotationLines').getRawValue()) {
			return this.formGroup
				.get('QuotationLines')
				.getRawValue()
				.map((x) => (x.Price * x.Quantity - x.TotalDiscount) * (1 + x.TaxRate / 100))
				.reduce((a, b) => +a + +b, 0);
		} else {
			return 0;
		}
	}

	calcTotalDiscount() {
		return this.formGroup.controls.QuotationLines.getRawValue()
			.map((x) => x.TotalDiscount)
			.reduce((a, b) => +a + +b, 0);
	}

	copyCopyToPurchaseOrder() {
		this.pageProvider.copyCopyToPurchaseOrder(this.item, CopyFromPurchaseQuotationToPurchaseOrder, this.modalController).then((data: any) => {
			if (data) {
				this.env.showPrompt(null, 'Do you want to move to the just created PO page ?', 'PO created!').then((_) => {
					this.nav('/purchase-order/' + data.Id);
				});
				this.env.publishEvent({ Code: this.pageConfig.pageName });
				this.refresh();
			}
		});
	}
	confirm() {
		this.formGroup.updateValueAndValidity();
		if (!this.formGroup.valid) {
			let invalidControls = this.findInvalidControlsRecursive(this.formGroup);
			const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
			Promise.all(translationPromises).then((values) => {
				let invalidControls = values;
				this.env.showMessage('Please recheck control(s): {{value}}', 'warning', invalidControls.join(' | '));
			});
		} else {
			let Ids = [this.item.Id];
			this.env.showPrompt(null, null, 'Do you want to confirm?').then((_) => {
				this.env
					.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/Confirm/', { Ids: Ids }).toPromise())
					.then((x) => {
						this.env.showMessage('Confirmed', 'success');
						this.env.publishEvent({ Code: this.pageConfig.pageName });
						this.refresh();
					});
			});
		}
	}
	sendQuotationRequest() {
		let Ids = [this.item.Id];
		this.env
			.actionConfirm('SendQuotationRequest', this.selectedItems.length, this.item?.Name, this.pageConfig.pageTitle, () =>
				this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/Open/', { Ids: Ids }).toPromise()
			)
			.then((x) => {
				this.env.showMessage('Reopened', 'success');
				this.env.publishEvent({ Code: this.pageConfig.pageName });
				this.refresh();
			});
	}
	updatePriceList() {
		this.pageProvider.updatePriceList([this.item.Id], PriceListVersionModalPage, this.modalController, this.env);
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
				}
				group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
				group.controls.TaxRate.markAsDirty();
				group.controls._Item.setValue(e._Item);

				if (!e._Vendors?.some((o) => o.Id == group.get('IDVendor')?.value)) {
					group.get('IDVendor').setValue(null);
					group.get('IDVendor').markAsDirty();
				}
				group.controls._Vendors.setValue(e._Vendors);

				this.IDUoMChange(group);
				return;
			} else {
				this.env.showMessage('The item has not been set tax');
			}
		} else {
			group.get('IDItemUoM').setValue(null);
			group.get('IDItemUoM').markAsDirty();
		}
	}
	IDUoMChange(group) {
		let idUoM = group.controls.IDItemUoM.value;

		if (idUoM) {
			let UoMs = group.controls._IDUoMDataSource?.value;
			let u = UoMs.find((d) => d.Id == idUoM);
			if (u && u.PriceList) {
				let p = u.PriceList.find((d) => d.Type == 'PriceListForVendor');
				let taxRate = group.controls.TaxRate?.value;
				if (p && taxRate != null) {
					let priceBeforeTax = null;

					if (taxRate < 0) taxRate = 0; //(-1 || -2) In case goods are not taxed

					if (p.IsTaxIncluded) {
						priceBeforeTax = p.Price / (1 + taxRate / 100);
					} else {
						priceBeforeTax = p.Price;
					}
					//let baseUOM = UoMs.find((d) => d.IsBaseUoM);
					
					group.controls.Price.setValue(priceBeforeTax);
					group.controls.Price.markAsDirty();

					// this.submitData(group);
					return;
				}
			}
		} else {
			group.controls.Price?.setValue(null);
			group.controls.Price?.markAsDirty();
	
		}
	}

	_currentContentType;
	changeContentType(e) {
		console.log(e);
		let quotationLines = this.formGroup.get('QuotationLines') as FormArray;
		if (quotationLines.controls.length > 0) {
			this.env
				.showPrompt('Tất cả hàng hoá trong danh sách sẽ bị xoá khi bạn chọn nhà cung cấp khác. Bạn chắc chắn chứ? ', null, 'Thông báo')
				.then(() => {
					let DeletedLines = quotationLines
						.getRawValue()
						.filter((f) => f.Id)
						.map((o) => o.Id);
					this.formGroup.get('DeletedLines').setValue(DeletedLines);
					this.formGroup.get('DeletedLines').markAsDirty();
					quotationLines.clear();
					this.item.OrderLines = [];
					console.log(quotationLines);
					console.log(this.item.OrderLines);
					this.saveChange();
					this._currentContentType = e.Code;
					return;
				})
				.catch(() => {
					this.formGroup.get('ContentType').setValue(this._currentContentType);
				});
		} else {
			this._currentContentType = e.Code;
			this.saveChange();
		}
	}

	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData(null);
	}

	toggleAllQuantity() {
		this.item._IsShippedAll = !this.item._IsShippedAll;
		var farr = this.formGroup.controls.QuotationLines as FormArray;
		if (this.item._IsShippedAll) {
			for (var i of farr.controls) {
				i.get('Quantity').setValue(i.get('QuantityRequired').value);
				i.get('Quantity').markAsDirty();
				this.calcTotalAfterTax();
			}
		} else {
			for (var i of farr.controls) {
				i.get('Quantity').setValue(0);
				i.get('Quantity').markAsDirty();
				this.calcTotalAfterTax();
			}
		}
		this.saveChange();
		console.log('toggleAll');
	}
	toggleQuantity(group) {
		if (group.controls.Quantity.value == group.controls.QuantityRequired.value) {
			group.controls.Quantity.setValue(0);
			group.controls.Quantity.markAsDirty();
			this.calcTotalAfterTax();
		} else {
			group.controls.Quantity.setValue(group.controls.QuantityRequired.value);
			group.controls.Quantity.markAsDirty();
			this.calcTotalAfterTax();
		}
		this.saveChange();
	}

	_isOpenAddAllProductFromVendor = false;
	formGroupQuantityProduct;
	openAllProductFromVendorPopever() {
		this.env
			.showPrompt({
				code: 'Do you want to add all products from vendor {value}?',
				value: this._vendorDataSource.selected.find((d) => d.Id == this.formGroup.controls.IDBusinessPartner.value).Name,
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
				Id: this.formGroup.controls.Id.value,
				IDVendor: this.formGroup.controls.IDBusinessPartner.value,
				QuantityRequired: this.formGroupQuantityProduct.controls.Quantity.value,
				RequiredDate: this.formGroup.controls.RequiredDate.value,
			};
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/AddAllProductFromVendor', postDTO).toPromise())
				.then((rs) => {
					if (rs) {
						this.refresh();
					} else {
						this.env.showMessage('Failed', 'danger');
					}
				});
		}
		this._isOpenAddAllProductFromVendor = false;
	}

	isOpenCopyPopover: boolean = false;
	@ViewChild('copyPopover') copyPopover!: HTMLIonPopoverElement;
	presentCopyPopover(e) {
		this.copyPopover.event = e;
		this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}

	isOpenPriceListVersionPopover: boolean = false;
	currentShowingPriceListVersionItem: any;
	popoverSpinner = false;
	@ViewChild('priceListVersionPopover') priceListVersionPopover!: HTMLIonPopoverElement;
	OpenViewPriceListVersionPopover(i, e) {
		// this.priceListVersionPopover.event = e;
		this.isOpenPriceListVersionPopover = !this.isOpenPriceListVersionPopover;
		if (this.isOpenPriceListVersionPopover) {
			if (!i.PriceListVersion) {
				this.currentShowingPriceListVersionItem = null;
				let queryPriceListVersion = {
					IDItemUoM: i.get('IDItemUoM').value,
					IDVendor: this.item.IDBusinessPartner,
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

	onClickImport() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}
	async export() {
		if (this.submitAttempt) return;
		let queryDetail = {
			IDPurchaseQuotation: this.formGroup.get('Id').value,
		};
		this.submitAttempt = true;
		this.env
			.showLoading('Please wait for a few moments', this.purchaseQuotationDetailProvider.export(queryDetail))
			.then((response: any) => {
				this.downloadURLContent(response);
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.submitAttempt = false;
			});
	}
	async import(event) {
		if (this.submitAttempt) {
			this.env.showMessage('erp.app.pages.sale.sale-order.message.importing', 'primary');
			return;
		}
		this.submitAttempt = true;
		this.env.publishEvent({
			Code: 'app:ShowAppMessage',
			IsShow: true,
			Id: 'FileImport',
			Icon: 'flash',
			IsBlink: true,
			Color: 'danger',
			Message: 'đang import',
		});
		const formData: FormData = new FormData();
		formData.append('fileKey', event.target.files[0], event.target.files[0].name);
		this.env
			.showLoading(
				'Please wait for a few moments',
				this.commonService.connect('UPLOAD', 'PURCHASE/Quotation/ImportDetailFile/' + this.formGroup.get('Id').value, formData).toPromise()
			)
			.then((resp: any) => {
				this.submitAttempt = false;
				this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
				this.refresh();
				if (resp.ErrorList && resp.ErrorList.length) {
					let message = '';
					for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
						if (i == 5) message += '<br> Còn nữa...';
						else {
							const e = resp.ErrorList[i];
							message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
						}
					this.env
						.showPrompt(
							{
								code: 'Có {{value}} lỗi khi import: {{value1}}',
								value: { value: resp.ErrorList.length, value1: message },
							},
							'Bạn có muốn xem lại các mục bị lỗi?',
							'Có lỗi import dữ liệu'
						)
						.then((_) => {
							this.downloadURLContent(resp.FileUrl);
						})
						.catch((e) => {});
				} else {
					this.env.showMessage('Import completed!', 'success');
				}
				// this.download(data);
			})
			.catch((err) => {
				this.submitAttempt = false;
				this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
				this.refresh();
				this.env.showMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
			});
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
		if (!this.pageConfig.canEdit) return;
		let groups = <FormArray>this.formGroup.controls.QuotationLines;
		if (!this.isAllChecked) {
			this.selectedOrderLines = new FormArray([]);
		}
		groups.controls.forEach((i) => {
			i.get('IsChecked').setValue(this.isAllChecked);
			i.get('IsChecked').markAsPristine();

			if (this.isAllChecked) this.selectedOrderLines.push(i);
		});
	}
	removeSelectedItems() {
		let groups = <FormArray>this.formGroup.controls.QuotationLines;
		if(this.selectedOrderLines.controls.some(g=> g.get('Id').value)){
			this.env
				.showPrompt({ code: 'ACTION_DELETE_MESSAGE', value: { value: this.selectedOrderLines.length } }, null, {
					code: 'ACTION_DELETE_MESSAGE',
					value: { value: this.selectedOrderLines.length },
				})
				.then((_) => {
					let Ids = this.selectedOrderLines.controls.map((fg) => fg.get('Id').value);
					// this.removeItem.emit(Ids);
					if (Ids && Ids.length > 0) {
						this.formGroup.get('DeletedLines').setValue(Ids);
						this.formGroup.get('DeletedLines').markAsDirty();
						//this.item.DeletedLines = Ids;
						this.saveChange().then((_) => {
							Ids.forEach((id) => {
								let index = groups.controls.findIndex((x) => x.get('Id').value == id);
								if (index >= 0) groups.removeAt(index);
							});
						});
					}
					this.selectedOrderLines = new FormArray([]);

				})
				.catch((_) => {});
		}
		else if(this.selectedOrderLines.controls.length>0){
			this.selectedOrderLines.controls.map((fg) => fg.get('Id').value).forEach((id) => {
					let index = groups.controls.findIndex((x) => x.get('Id').value == id);
					if (index >= 0) groups.removeAt(index);
			});
			this.selectedOrderLines = new FormArray([]);

		}
		else{
			this.env.showMessage('Please select at least one item to remove', 'warning');
		}
	}

}
