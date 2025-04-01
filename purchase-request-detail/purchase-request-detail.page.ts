import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
	BRA_BranchProvider,
	CRM_ContactProvider,
	HRM_StaffProvider,
	PURCHASE_RequestDetailProvider,
	SYS_ConfigProvider,
	WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PurchaseOrderModalPage } from './purchase-order-modal/purchase-order-modal.page';
import { PurchaseQuotationModalPage } from './purchase-quotation-modal/purchase-quotation-modal.page';
import { PURCHASE_RequestService } from '../purchase-request.service';

@Component({ selector: 'app-purchase-request-detail', templateUrl: './purchase-request-detail.page.html', styleUrls: ['./purchase-request-detail.page.scss'], standalone: false })
export class PurchaseRequestDetailPage extends PageBase {
	@ViewChild('importfile') importfile: any;
	checkingCanEdit = false;
	statusList = [];
	statusLineList = [];
	contentTypeList = [];
	branchList;
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
		public pageProvider: PURCHASE_RequestService,
		public purchaseRequestDetailProvider: PURCHASE_RequestDetailProvider,
		public contactProvider: CRM_ContactProvider,
		public branchProvider: BRA_BranchProvider,
		public itemProvider: WMS_ItemProvider,
		public sysConfigProvider: SYS_ConfigProvider,
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
		this.buildFormGroup();
		this.pageConfig.isDetailPage = true;
	}
	buildFormGroup() {
		this.formGroup = this.formBuilder.group({
			IDBranch: [this.env.selectedBranch, Validators.required],
			IDRequester: [''],
			IDRequestBranch: [''],
			//  IDStorer: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
			IDVendor: [null],
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
			ForeignName: [''],
			Remark: [''],
			ForeignRemark: [''],
			ContentType: ['Item', Validators.required],
			Status: new FormControl({ value: 'Draft', disabled: true }, Validators.required),
			RequiredDate: ['', Validators.required],
			PostingDate: [''],
			DueDate: [''],
			DocumentDate: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),

			OrderLines: this.formBuilder.array([]),
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
		this.branchList = [...this.env.branchList];
		let sysConfigQuery = ['PRUsedApprovalModule'];
		Promise.all([
			this.env.getStatus('PurchaseRequest'),
			this.contactProvider.read({ IsVendor: true, Take: 20 }),
			this.env.getStatus('PurchaseQuotationLine'),
			this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch }),
		]).then((values: any) => {
			if (values[0]) this.statusList = values[0];
			if (values[1] && values[1].data) {
				this._vendorDataSource.selected.push(...values[1].data);
			}
			if (values[2]) this.statusLineList = values[2];
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
		this.buildFormGroup();
		if (!this.item.Id) {
			this.item.IDRequester = this.env.user.StaffID;
			this.item._Requester = { Id: this.env.user.StaffID, FullName: this.env.user.FullName };
		}
		if (this.pageConfig['PRUsedApprovalModule']) {
			this.pageConfig['canApprove'] = false;
		}
		super.loadedData(event);
		if (this.item?._Vendor) {
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, ...[this.item?._Vendor]];
		}

		if (this.item._Requester) {
			this._staffDataSource.selected.push(lib.cloneObject(this.item._Requester));
		}

		this._staffDataSource.initSearch();
		this._vendorDataSource.initSearch();

		if (!this.item.Id) {
			this.formGroup.controls['IDRequester'].markAsDirty();
			this.formGroup.controls['ContentType'].markAsDirty();
		}

		if (this.item._Vendor) {
			this._currentVendor = this.item._Vendor;
		}
		this._currentContentType = this.formGroup.controls['ContentType'].value;
		if (this.formGroup.get('Id').value && this.formGroup.get('Status').value != 'Draft' && this.formGroup.get('Status').value != 'Unapproved') {
			this.formGroup.disable();
			this.pageConfig.canEdit = false;
		}

		this.getNearestCompany(this.env.selectedBranch);
	}

	removeItem(Ids) {
		let groups = <FormArray>this.formGroup.controls.OrderLines;
		if (Ids && Ids.length > 0) {
			this.formGroup.get('DeletedLines').setValue(Ids);
			this.formGroup.get('DeletedLines').markAsDirty();
			this.saveChange().then((s) => {
				Ids.forEach((id) => {
					let index = groups.controls.findIndex((x) => x.get('Id').value == id);
					if (index >= 0) groups.removeAt(index);

					this.formGroup.get('TotalAfterTax').setValue(this.calcTotalAfterTax());
				});
			});
		}
	}

	renderFormArray(e) {
		this.formGroup.controls.OrderLines = e;
	}

	saveOrderBack() {
		this.saveChange();
	}
	_currentContentType;
	changeContentType(e) {
		console.log(e);
		let orderLines = this.formGroup.get('OrderLines') as FormArray;
		if (orderLines.controls.length > 0) {
			this.env
				.showPrompt('Tất cả hàng hoá trong danh sách sẽ bị xoá khi bạn chọn nhà cung cấp khác. Bạn chắc chắn chứ? ', null, 'Thông báo')
				.then(() => {
					let DeletedLines = orderLines
						.getRawValue()
						.filter((f) => f.Id)
						.map((o) => o.Id);
					this.formGroup.get('DeletedLines').setValue(DeletedLines);
					this.formGroup.get('DeletedLines').markAsDirty();
					orderLines.clear();
					this.item.OrderLines = [];
					console.log(orderLines);
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

	calcTotalAfterTax() {
		if (this.formGroup.get('OrderLines').getRawValue()) {
			return this.formGroup
				.get('OrderLines')
				.getRawValue()
				.map((x) => (x.UoMPrice * x.Quantity - x.TotalDiscount) * (1 + x.TaxRate / 100))
				.reduce((a, b) => +a + +b, 0);
		} else {
			return 0;
		}
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

	changeVendor(e) {
		if (e && !this._vendorDataSource.selected.some((s) => s.Id == e.Id))
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, ...[{ Id: e.Id, Name: e.Name, Code: e.Code }]];

		let orderLines = this.formGroup.get('OrderLines') as FormArray;
		if (orderLines.controls.length > 0) {
			if (e) {
				this.env
					.showPrompt('Tất cả hàng hoá trong danh sách khác với nhà cung cấp được chọn sẽ bị xoá. Bạn có muốn tiếp tục ? ', null, 'Thông báo')
					.then(() => {
						let DeletedLines = orderLines
							.getRawValue()
							.filter((f) => f.Id && f.IDVendor != e.Id && !f._Vendors?.map((v) => v.Id)?.includes(e.Id))
							.map((o) => o.Id);

						orderLines.controls
							.filter((f) =>
								f
									.get('_Vendors')
									.value.map((v) => v.Id)
									.includes(e.Id)
							)
							.forEach((o) => {
								o.get('IDVendor').setValue(e.Id);
								o.get('IDVendor').markAsDirty();
							});
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
			console.log(this.formGroup.get('IDVendor').value);
		} else {
			this._currentVendor = e;
			this.saveChange();
		}
	}

	changeRequiredDate() {
		let orderLines = this.formGroup.get('OrderLines') as FormArray;
		orderLines.controls.forEach((o) => {
			if (!o.get('RequiredDate').value) {
				o.get('RequiredDate').setValue(this.formGroup.get('RequiredDate').value);
				o.get('RequiredDate').markAsDirty();
			}
		});
		this.saveChange();
	}

	async saveChange() {
		this.formGroup.get('TotalAfterTax').setValue(this.calcTotalAfterTax());
		return super.saveChange2();
	}

	savedChange(savedItem = null, form = this.formGroup) {
		if (savedItem) {
			this.item = savedItem;
			this.formGroup.patchValue(savedItem);
			if (form.controls.Id && savedItem.Id && form.controls.Id.value != savedItem.Id) form.controls.Id.setValue(savedItem.Id);
			if (this.pageConfig.isDetailPage && form == this.formGroup && this.id == 0) {
				this.id = savedItem.Id;
				if (window.location.hash.endsWith('/0')) {
					let newURL = window.location.hash.substring(0, window.location.hash.length - 1) + savedItem.Id;
					history.pushState({}, null, newURL);
				}
			}
		}
		form.markAsPristine();
		this.cdr.detectChanges();
		this.submitAttempt = false;
		this.env.showMessage('Saving completed!', 'success');
	}
	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
	}

	onClickImport() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}
	async export() {
		if (this.submitAttempt) return;
		let queryDetail = {
			IDPurchaseRequest: this.formGroup.get('Id').value,
		};
		this.submitAttempt = true;
		this.env
			.showLoading('Please wait for a few moments', this.purchaseRequestDetailProvider.export(queryDetail))
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
				this.commonService.connect('UPLOAD', ApiSetting.apiDomain('PURCHASE/Request/ImportDetailFile/' + this.formGroup.get('Id').value), formData).toPromise()
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

	copyToPO() {
		let orderLines = this.formGroup.get('OrderLines').value.filter((d) => d.Id);
		let vendorList = [];
		this.formGroup.get('OrderLines').value.forEach((o) => {
			if (o.IDVendor) {
				vendorList = [...vendorList, ...o._Vendors.filter((v) => v.Id == o.IDVendor && !vendorList.some((vd) => v.Id == vd.Id))];
			} else {
				vendorList = [...vendorList, ...o._Vendors.filter((v) => !vendorList.some((vd) => v.Id == vd.Id))];
			}
		});
		this.pageProvider
			.copyToPO(this.formGroup.get('Id').value, orderLines, this._currentVendor, vendorList, PurchaseOrderModalPage, this.modalController, this.env)
			.then((rs: any) => {
				if (rs) {
					this.env.showMessage('PO created!', 'success');
					this.env.showPrompt('Create purchase order successfully!', 'Do you want to navigate to purchase order?').then((d) => {
						this.nav('/purchase-order/' + rs.Id, 'forward');
					});
					this.refresh();
					this.env.publishEvent({ Code: this.pageConfig.pageName });
				}
			});
	}
	sendRequestQuotationToVendor() {
		let orderLines = this.formGroup.get('OrderLines').value.filter((d) => d.Id);
		this.pageProvider
			.sendRequestQuotationToVendor(this.formGroup.get('Id').value, orderLines, this._currentVendor, PurchaseQuotationModalPage, this.modalController, this.env)
			.then((rs) => {
				if (rs) {
					this.env.showMessage('Purchase quotations created!', 'success');
					this.refresh();
					this.env.publishEvent({
						Code: this.pageConfig.pageName,
					});
				}
			});
		// let vendorList = [];
		// this.formGroup.get('OrderLines').value.forEach((o) => {
		// 	if (o.IDVendor) {
		// 		vendorList = [...vendorList, ...o._Vendors.filter((v) => v.Id == o.IDVendor && !vendorList.some((vd) => v.Id == vd.Id))];
		// 	} else {
		// 		vendorList = [...vendorList, ...o._Vendors.filter((v) => !vendorList.some((vd) => v.Id == vd.Id))];
		// 	}
		// });
	}
	selectedRequestBranch;
	getNearestCompany(IDBranch) {
		let currentBranch = this.env.branchList.find((d) => d.Id == IDBranch);
		if (currentBranch) {
			if (currentBranch.Type == 'Company') {
				this.selectedRequestBranch = currentBranch.Id;
				return true;
			} else {
				let parentBranch: any = this.env.branchList.find((d) => d.Id == currentBranch.IDParent);
				if (this.getNearestCompany(parentBranch.Id)) {
					return true;
				}
			}
		}
	}

	isOpenCopyPopover = false;
	@ViewChild('copyPopover') copyPopover!: HTMLIonPopoverElement;
	presentCopyPopover(e) {
		this.copyPopover.event = e;
		this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}
}
