import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BRA_BranchProvider,
	CRM_ContactProvider,
	HRM_StaffProvider,
	PURCHASE_QuotationProvider,
	PURCHASE_RequestDetailProvider,
	PURCHASE_RequestProvider,
	WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { CopyToPurchaseOrderModalPage } from '../copy-to-purchase-order-modal/copy-to-purchase-order-modal.page';
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
	statusList = [];
	_statusLineList = [];
	contentTypeList = [];
	vendorView = false;
	markAsPristine = false;
	_currentVendor;
	_isVendorSearch = false;
	_vendorDataSource = this.buildSelectDataSource((term) => {
		return this.contactProvider.search({ SkipAddress: true, IsVendor: true, SortBy: ['Id_desc'], Take: 20, Skip: 0, Term: term });
	});

	_staffDataSource = this.buildSelectDataSource((term) => {
		return this.staffProvider.search({ Take: 20, Skip: 0, Term: term });
	});

	constructor(
		public pageProvider: PURCHASE_QuotationService,
		public purchaseRequestDetailProvider: PURCHASE_RequestDetailProvider,
		public contactProvider: CRM_ContactProvider,
		public branchProvider: BRA_BranchProvider,
		public itemProvider: WMS_ItemProvider,
		public popoverCtrl: PopoverController,
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
		this.formGroup = this.formBuilder.group({
			IDBranch: [this.env.selectedBranch, Validators.required],
			IDRequester: [''],
			IDRequestBranch: [''],
			IDBusinessPartner: [''],
			SourceKey: new FormControl({ value: '', disabled: true }),
			SourceType: new FormControl({ value: '', disabled: true }),
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: [''],
			ForeignName: [''],
			Remark: [''],
			ForeignRemark: [''],
			ContentType: ['Item', Validators.required],
			Status: new FormControl({ value: 'Open', disabled: true }, Validators.required),
			RequiredDate: [''],
			ValidUntilDate: [''],
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
		if (this.env.user.IDBusinessPartner > 0 && !this.env.user.SysRoles.includes('STAFF') && this.env.user.SysRoles.includes('VENDOR')) {
			this.vendorView = true;
		}
	}

	preLoadData(event) {
		this.contentTypeList = [
			{ Code: 'Item', Name: 'Items' },
			{ Code: 'Service', Name: 'Service' },
		];
		Promise.all([this.env.getStatus('PurchaseQuotation'), this.contactProvider.read({ IsVendor: true, Take: 20 }), this.env.getStatus('PurchaseQuotationLine')]).then(
			(values: any) => {
				if (values[0]) this.statusList = values[0];
				if (values[1] && values[1].data) {
					this._vendorDataSource.selected.push(...values[1].data);
				}
				if (values[2]) this._statusLineList = values[2];
				super.preLoadData(event);
			}
		);
	}

	loadedData(event) {
		if (!['Open', 'Confirmed', 'Unapproved'].includes(this.item.Status)) this.pageConfig.canEdit = false;
		if (this.item.Status == 'Confirmed' && this.vendorView) this.pageConfig.canEdit = false;
		super.loadedData(event);
		this.setQuotationLines();

		if (this.item.SourceType == 'FromPurchaseRequest') {
			this.formGroup.controls.ContentType.disable();
			this.formGroup.controls.IDBusinessPartner.disable();
			this.formGroup.controls.RequiredDate.disable();
			this.formGroup.controls.DocumentDate.disable();
			this.formGroup.controls.PostingDate.disable();
			this.formGroup.controls.DueDate.disable();
			let enableValid = ['Submitted', 'Approved', 'Closed'];
			if (!enableValid.includes(this.item.Status)) {
				this.formGroup.controls.ValidUntilDate.enable();
			}
		}

		if (this.item._Vendor) {
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, ...[this.item._Vendor]];
		}
		this._vendorDataSource.initSearch();
		if (this.vendorView && this.item.Status == 'Open') this.pageConfig.ShowConfirm = true;
		else this.pageConfig.ShowCanConfirm = false;
	}

	async saveChange() {
		return super.saveChange2();
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	setQuotationLines() {
		this.formGroup.controls.QuotationLines = new FormArray([]);
		if (this.item?.QuotationLines.length)
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
			IDItem: new FormControl({ value: line.IDItem || 0, disabled: this.item?.SourceType != null }), //Validators.required
			IDItemUoM: new FormControl(
				{ value: line.IDItemUoM, disabled: this.item?.SourceType != null },
				[this.item?.contentType === 'Item' ? Validators.required : null].filter(Boolean)
			),
			Id: [line.Id],
			Status: [line.Status],
			Sort: [line.Sort],
			Name: [line.Name],
			Remark: [line.Remark],
			RequiredDate: new FormControl({ value: line.RequiredDate, disabled: this.item?.SourceType != null }), //,Validators.required
			InfoPrice: new FormControl({ value: line.InfoPrice, disabled: this.item?.SourceType != null }),
			Price: [line.Price, Validators.required],
			UoMName: [line.UoMName],
			Quantity: new FormControl(
				line.Quantity,
				this.item.ContentType === 'Item' ? Validators.required : null // Conditional validator
			),
			QuantityRemainingOpen: new FormControl({ value: line.QuantityRemainingOpen, disabled: true }),
			QuantityRequired: new FormControl({ value: line.QuantityRequired, disabled: this.item?.SourceType != null }),
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
		if (groups.controls[index].get('Id').value) {
			this.env
				.showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
				.then((_) => {
					let Ids = [];
					Ids.push(groups.controls[index].get('Id').value);
					// this.removeItem.emit(Ids);
					if (Ids && Ids.length > 0) {
						// this.formGroup.get('DeletedLines').setValue(Ids);
						// this.formGroup.get('DeletedLines').markAsDirty();
						this.item.DeletedLines = Ids;
						this.pageProvider.save(this.item).then((s) => {
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
		this.pageProvider
			.copyCopyToPurchaseOrder(this.item, CopyToPurchaseOrderModalPage, this.modalController)
			.then((data: any) => {
				if (data) {
					this.env.showPrompt(null, 'Do you want to move to the just created PO page ?', 'PO created!').then((_) => {
						this.nav('/purchase-order/' + data.Id);
					});
					this.env.publishEvent({ Code: this.pageConfig.pageName });
					this.refresh();
				}
			})
			.catch((err) => {
				this.env.showMessage(err, 'danger');
			});
	}
	confirm() {
		let Ids = [this.item.Id];
		this.env.showPrompt(null, null, 'Do you want to confirm?').then((_) => {
			this.env
				.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/Confirm/', { Ids: Ids }).toPromise())
				.then((x) => {
					this.env.showMessage('Confirmed', 'success');
					this.refresh();
				})
				.catch((x) => {
					this.env.showMessage('Failed', 'danger');
				});
		});
	}

	updatePriceList() {
		this.pageProvider.updatePriceList([this.item.Id], PriceListVersionModalPage, this.modalController, this.env);
	}

	IDUoMChange(g) {}
	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData(null);
	}

	isOpenCopyPopover: boolean = false;
	@ViewChild('copyPopover') copyPopover!: HTMLIonPopoverElement;
	presentCopyPopover(e) {
		this.copyPopover.event = e;
		this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}
}
