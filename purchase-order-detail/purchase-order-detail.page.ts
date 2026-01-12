import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, CRM_ContactProvider, PURCHASE_OrderDetailProvider, PURCHASE_OrderProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { SaleOrderPickerModalPage } from '../sale-order-picker-modal/sale-order-picker-modal.page';
import { PURCHASE_OrderService } from '../purchase-order-service';
import { CopyFromPurchaseOrderToReceiptModalPage } from '../copy-from-purchase-order-to-receipt-modal/copy-from-purchase-order-to-receipt-modal.page';

@Component({
	selector: 'app-purchase-order-detail',
	templateUrl: './purchase-order-detail.page.html',
	styleUrls: ['./purchase-order-detail.page.scss'],
	standalone: false,
})
export class PurchaseOrderDetailPage extends PageBase {
	@ViewChild('importfile') importfile: any;
	checkingCanEdit = false;
	branchList = [];
	storerList = [];
	statusList = [];
	carrierList = [];
	vendorView = false;
	paymentStatusList = [];
	_vendorDataSource = this.buildSelectDataSource((term) => {
		return this.contactProvider.search({
			SkipAddress: true,
			IsVendor: true,
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Keyword: term,
		});
	});
	paymentFormGroup: FormGroup;
	constructor(
		public pageProvider: PURCHASE_OrderService,
		public purchaseOrderDetailProvider: PURCHASE_OrderDetailProvider,
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
		public router: Router,
		public loadingController: LoadingController,
		public commonService: CommonService
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.buildFormGroup();
		if (this.env.user.IDBusinessPartner > 0 && this.env.user.SysRoles.includes('VENDOR')) {
			this.vendorView = true;
		}
		this.paymentFormGroup = formBuilder.group({ PaymentType: [''], PaymentSubType: [''], PaymentReason: [''] });
		Object.assign(pageProvider, {
			importDetail(fileToUpload: File, id) {
				const formData: FormData = new FormData();
				formData.append('fileKey', fileToUpload, fileToUpload.name);
				return new Promise((resolve, reject) => {
					this.commonService
						.connect('UPLOAD', ApiSetting.apiDomain('PURCHASE/Order/ImportDetailFile/' + id), formData)
						.toPromise()
						.then((data) => {
							resolve(data);
						})
						.catch((err) => {
							reject(err);
						});
				});
			},
		});
	}
	buildFormGroup() {
		this.formGroup = this.formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			IDWarehouse: [''],
			IDStorer: new FormControl({ value: '', disabled: false }, Validators.required),
			IDVendor: new FormControl({ value: '', disabled: false }, Validators.required),
			Id: new FormControl({ value: '', disabled: true }),
			Code: new FormControl({ value: '', disabled: false }),
			Name: new FormControl({ value: '', disabled: false }),
			// ForeignName: [''],
			Remark: new FormControl({ value: '', disabled: false }),
			// ForeignRemark: [''],
			SourceKey: new FormControl({ value: '', disabled: true }),
			SourceType: new FormControl({ value: '', disabled: true }),
			OrderDate: new FormControl({ value: '', disabled: true }),
			ExpectedReceiptDate: new FormControl({ value: '', disabled: false }),
			ReceiptedDate: new FormControl({ value: '', disabled: true }),
			Type: ['Regular'],
			Status: new FormControl({ value: 'Draft', disabled: true }),
			PaymentStatus: new FormControl({ value: 'NotSubmittedYet', disabled: true }),
			IsDisabled: new FormControl({ value: '', disabled: true }),
			OrderLines: this.formBuilder.array([]),
			TotalDiscount: new FormControl({ value: '', disabled: true }),
			TotalAfterTax: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}
	print() {
		this.pageConfig['purchase-order-note'] = true;
		this.router.navigate(['/purchase-order-note/' + this.item.Id], { state: { print: true } });
	}
	preLoadData(event) {
		this.checkingCanEdit = this.pageConfig.canEdit;
		this.branchList = lib.cloneObject(this.env.branchList);
		this.contactProvider.read({ IsStorer: true, Take: 5000 }).then((resp) => {
			this.storerList = resp['data'];
		});

		this.env.getStatus('PurchaseOrder').then((data: any) => {
			this.statusList = data;
		});
		this.env.getStatus('POPaymentStatus').then((data: any) => {
			this.paymentStatusList = data;
		});
		Promise.all([
			this.pageProvider.commonService
				.connect('GET', 'SYS/Config/ConfigByBranch', {
					Code: 'POShowSuggestedQuantity',
					IDBranch: this.env.selectedBranch,
				})
				.toPromise(),
			this.pageProvider.commonService
				.connect('GET', 'SYS/Config/ConfigByBranch', {
					Code: 'POShowAdjustedQuantity',
					IDBranch: this.env.selectedBranch,
				})
				.toPromise(),
			this.contactProvider.read({ IsVendor: true, Take: 20 }),
		]).then((values: any) => {
			this.pageConfig.POShowSuggestedQuantity = JSON.parse(values[0]['Value']);
			this.pageConfig.POShowAdjustedQuantity = JSON.parse(values[1]['Value']);
			if (values && values[2] && values[2].data) {
				this._vendorDataSource.selected = [...values[2].data];
			}
			super.preLoadData(event);
		});
	}
	renderFormArray(formArray: FormArray) {
		this.formGroup.controls.OrderLines = formArray as any;
	}

	loadedData(event) {
		this.pageConfig.canEdit = this.checkingCanEdit;
		this.buildFormGroup();

		if (this.item) {
			this.item.OrderDateText = lib.dateFormat(this.item.OrderDate, 'hh:MM dd/mm/yyyy');
			if (this.item.OrderLines) this.item.OrderLines.sort((a, b) => (a.Id > b.Id ? 1 : b.Id > a.Id ? -1 : 0));

			if (!(this.item.Status == 'Draft' || this.item.Status == 'Unapproved')) {
				this.pageConfig.canEdit = false;
			}
		}

		super.loadedData(event);
		let notShowRequestOutgoingPaymentPaymentStatus = ['Unapproved', 'Paid'];
		let notShowRequestOutgoingPayment = ['Draft', 'Submitted', 'Approved', 'PORequestQuotation', 'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Canceled'];
		if (
			notShowRequestOutgoingPayment.includes(this.formGroup.get('Status').value) ||
			notShowRequestOutgoingPaymentPaymentStatus.includes(this.formGroup.get('PaymentStatus').value)
		) {
			this.pageConfig.ShowRequestOutgoingPayment = false;
		}
		if (!this.item?.Id) this.formGroup.controls.IDBranch.markAsDirty();
		if (this.item?._Vendor) {
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, this.item?._Vendor];
			this._currentBusinessPartner = this.item._Vendor;
		}
		this._vendorDataSource.initSearch();
	}

	removeOrderItem(Ids: number[]) {
		if (!Ids || !Ids.length) return;
		this.purchaseOrderDetailProvider.delete(Ids.map((id) => ({ Id: id }))).then((resp) => {
			const groups = this.formGroup.get('OrderLines') as FormArray;
			for (let i = groups.length - 1; i >= 0; i--) {
				const id = groups.at(i).get('Id')?.value;
				if (Ids.includes(id)) {
					groups.removeAt(i);
				}
			}
			this.env.publishEvent({ Code: this.pageConfig.pageName });
			this.env.showMessage('Deleted!', 'success');
		});
		this.calcTotalAfterTax();
	}

	saveOrder() {
		this.debounce(() => {
			super.saveChange2();
		}, 300);
	}

	changeVendor(e) {
		this._currentBusinessPartner = e;
		this.saveOrder();
	}
	calcTotalDiscount() {
		return this.formGroup.controls.OrderLines.getRawValue()
			.map((x) => x.TotalDiscount)
			.reduce((a, b) => +a + +b, 0);
	}

	calcTotalAfterTax() {
		const orderLines = this.formGroup.controls.OrderLines?.getRawValue() ?? [];
		if (!Array.isArray(orderLines) || orderLines.length === 0) return 0;

		return orderLines
			.map((x) => {
				const price = +x.UoMPrice || 0;
				const qtyExpected = +x.UoMQuantityExpected || 0;
				const qtyAdjusted = +x.QuantityAdjusted || 0;
				const discount = +x.TotalDiscount || 0;
				const taxRate = +x.TaxRate || 0;
				return (price * (qtyExpected + qtyAdjusted) - discount) * (1 + taxRate / 100);
			})
			.reduce((a, b) => a + b, 0);
	}
	savedChange(savedItem = null, form = this.formGroup) {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData(null);
	}

	segmentView = 's1';
	segmentChanged(ev: any) {
		this.segmentView = ev.detail.value;
		this.segmentView = ev.detail.value;
		if (this.segmentView == 's3') {
			this.getPaymentHistory();
		}
	}

	importClick() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}
	async uploadOrderLine(event) {
		if (event.target.files.length == 0) return;

		const loading = await this.loadingController.create({
			cssClass: 'my-custom-class',
			message: 'Please wait for a few moments',
		});
		await loading.present().then(() => {
			this.pageProvider['importDetail'](event.target.files[0], this.id)
				.then((resp: any) => {
					this.refresh();
					if (loading) loading.dismiss();

					if (resp.ErrorList && resp.ErrorList.length) {
						let message = '';
						for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
							if (i == 5) message += '<br> Còn nữa...';
							else {
								const e = resp.ErrorList[i];
								message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
							}

						this.alertCtrl
							.create({
								header: 'Có lỗi import dữ liệu',
								subHeader: 'Bạn có muốn xem lại các mục bị lỗi?',
								message: 'Có ' + resp.ErrorList.length + ' lỗi khi import:' + message,
								cssClass: 'alert-text-left',
								buttons: [
									{ text: 'Không', role: 'cancel', handler: () => {} },
									{
										text: 'Có',
										cssClass: 'success-btn',
										handler: () => {
											this.downloadURLContent(resp.FileUrl);
										},
									},
								],
							})
							.then((alert) => {
								alert.present();
							});
					} else {
						this.env.showMessage('Import completed!', 'success');
						this.env.publishEvent({ Code: this.pageConfig.pageName });
					}
				})
				.catch((err) => {
					if (err.statusText == 'Conflict') {
						this.downloadURLContent(err._body);
					}
					if (loading) loading.dismiss();
				});
		});
	}

	isShowReceiptModal = false;
	receiptFormGroup = this.formBuilder.group({
		Code: ['', Validators.required],
		IDCarrier: ['', Validators.required],
		VehicleNumber: ['', Validators.required],
		ExpectedReceiptDate: ['', Validators.required],
	});
	onDismissReceiptModal(isApply = false) {
		this.isShowReceiptModal = false;

		if (isApply) {
			this.receiptFormGroup.updateValueAndValidity();
			if (!this.receiptFormGroup.valid) {
				let invalidControls = this.findInvalidControlsRecursive(this.receiptFormGroup);
				const translationPromises = invalidControls.map((control) => this.env.translateResource(control));
				Promise.all(translationPromises).then((values) => {
					let invalidControls = values;
					this.env.showMessage('Please recheck control(s): {{value}}', 'warning', invalidControls.join(' | '));
				});
			} else {
				this.env
					.showLoading(
						'Please wait for a few moments',
						this.pageProvider['copyToReceipt'](
							{
								...this.item,
								...{ ...this.receiptFormGroup.getRawValue(), Status: 'Confirmed' },
							},
							this.env,
							this.pageConfig
						)
					)
					.then((r: any) => {
						let messageTitle;
						let subMessage = 'Do you want to navigate to the receipt just created?';
						let message = '';
						let recheckList = [];
						let ids = [];
						if (r.Id) ids.push(r.Id);
						if (r.RecheckReceipts && r.RecheckReceipts.length) recheckList = [...recheckList, ...r.RecheckReceipts];
						if (recheckList.length > 0) message = recheckList.join(', ');
						if (ids.length > 0) messageTitle = { code: 'Created ASN successfully with Id: {{value}}', value: ids.join(', ') };
						else messageTitle = 'PO has entered a full amount of quantity!';
						this.env
							.showPrompt(message != '' ? { code: 'Refer to ASN: {{value}}', value: message } : null, ids.length > 0 ? subMessage : null, messageTitle)
							.then((_) => {
								if (ids.length > 0) {
									this.refresh();
									this.env.publishEvent({ Code: this.pageConfig.pageName });
									this.nav('/receipt/' + r.Id);
								}
							})
							.catch((e) => {
								if (ids.length > 0) {
									this.refresh();
									this.env.publishEvent({ Code: this.pageConfig.pageName });
								}
							});
					})
					.catch((err) => {
						this.env.showMessage('Cannot create ASN, please try again later', 'danger');
					});
			}
		}
	}

	confirmOrder() {
		if (this.carrierList.length == 0) {
			this.contactProvider
				.read({ IsCarrier: true })
				.then((rs: any) => {
					if (rs && rs.data?.length > 0) {
						this.carrierList = [...rs.data];
					}
				})
				.finally(() => (this.isShowReceiptModal = true));
		} else this.isShowReceiptModal = true;
	}

	async copyToReceipt() {
		this.item._qtyReceipted = this.item._Receipts;
		const modal = await this.modalController.create({
			component: CopyFromPurchaseOrderToReceiptModalPage,
			componentProps: { _item: this.item },
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data) {
			this.env.showPrompt(null, 'Do you want to move to the just created ASN page ?', 'ASN created!').then((_) => {
				this.env.publishEvent({ Code: this.pageConfig.pageName });
				this.nav('/receipt/' + data.Id);
			});
		}
	}

	async createInvoice() {
		// this.env
		// 	.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Order/CopyToAPInvoice/', { Ids: [this.item.Id] }).toPromise())
		// 	.then((resp: any) => {
		// 		this.env
		// 			.showPrompt('Bạn có muốn mở hóa đơn vừa tạo?')
		// 			.then((_) => {
		// 				if (resp.length == 1) {
		// 					this.nav('/ap-invoice/' + resp[0]);
		// 				} else {
		// 					this.nav('/ap-invoice');
		// 				}
		// 			})
		// 			.catch((_) => {});
		// 	})
		// 	.catch((err) => {
		// 		this.env.showMessage(err);
		// 	});
		this.pageProvider
			.createInvoice(this.item, this.env, this.pageConfig)
			.then((resp: any) => {
				this.env
					.showPrompt('Bạn có muốn mở hóa đơn vừa tạo?')
					.then((_) => {
						if (resp.length == 1) {
							this.nav('/ap-invoice/' + resp[0]);
						} else {
							this.nav('/ap-invoice');
						}
					})
					.catch((_) => {});
			})
			.catch((err) => this.env.showMessage(err));
	}

	async showSaleOrderPickerModal() {
		const modal = await this.modalController.create({
			component: SaleOrderPickerModalPage,
			componentProps: { id: this.item.Id },
			cssClass: 'modal90',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();

		if (data && data.length) {
			console.log(data);
			console.log(data.map((i) => i.Id));

			const loading = await this.loadingController.create({
				cssClass: 'my-custom-class',
				message: 'Please wait for a few moments',
			});
			await loading.present().then(() => {
				let postData = { Id: this.item.Id, SOIds: data.map((i) => i.Id) };
				this.commonService
					.connect('POST', ApiSetting.apiDomain('PURCHASE/Order/ImportDetailFromSaleOrders/'), postData)
					.toPromise()
					.then((data) => {
						if (loading) loading.dismiss();
						this.refresh();
						this.env.publishEvent({ Code: this.pageConfig.pageName });
					})
					.catch((err) => {
						console.log(err);
						this.env.showMessage('Cannot add product. Please try again later.', 'danger');
						if (loading) loading.dismiss();
					});
			});
		}
	}
	_currentBusinessPartner;
	createOutgoingPayment() {
		let date = this.formGroup.get('OrderDate').value;

		let navigationExtras: NavigationExtras = {
			state: {
				OutgoingPaymentDetails: [
					{
						DocumentEntry: this.formGroup.get('Id').value,
						Id: 0,
						DocumentType: 'Order',
						Amount: this.formGroup.get('TotalAfterTax').value - this.item.PaidAmount,
					},
				],
				_BusinessPartner: this._currentBusinessPartner,
				IDBusinessPartner: this.formGroup.get('IDVendor').value,
				Name: 'Pay for PO #' + this.formGroup.get('Id').value,
				IDStaff: this.env.user.StaffID,
				IDBranch: this.formGroup.get('IDBranch').value,
				Amount: this.formGroup.get('TotalAfterTax').value - this.item.PaidAmount,
				DocumentDate: date,
				PostingDate: date,
				DueDate: date,
			},
		};
		this.nav('/outgoing-payment/0', 'forward', navigationExtras);
	}
	paymentDetailList = [];
	showSpinnerPayment = false;
	outgoingPaymentStatusList;
	getPaymentHistory() {
		this.showSpinnerPayment = true;
		let queryPayment = { Id: this.formGroup.get('Id').value };
		this.commonService
			.connect('GET', 'PURCHASE/Order/GetPaymentHistory/', queryPayment)
			.toPromise()
			.then((result: any) => {
				this.paymentDetailList = result;
				if (!this.outgoingPaymentStatusList) {
					this.env.getStatus('OutgoingPaymentStatus').then((rs) => {
						this.outgoingPaymentStatusList = rs;
						this.paymentDetailList.forEach((i) => {
							i._Status = this.outgoingPaymentStatusList.find((d) => d.Code == i.Status);
						});
					});
				} else {
					this.paymentDetailList.forEach((i) => {
						i._Status = this.outgoingPaymentStatusList.find((d) => d.Code == i.Status);
					});
				}
				// this.paymentDetailList = result;
				//   this.paymentDetailList.forEach(i=>{
				//     i._Status = this.paymentStatusList.find((d) => d.Code == i.Status);
				// })
			})
			.catch((err) => this.env.showMessage(err, 'danger'))
			.finally(() => {
				this.showSpinnerPayment = false;
			});
	}

	ngOnDestroy() {
		this.dismissPopover();
		if (this.isOpenCopyPopover) this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}
	isOpenCopyPopover = false;
	@ViewChild('copyPopover') copyPopover!: HTMLIonPopoverElement;
	presentCopyPopover(e) {
		this.copyPopover.event = e;
		this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}
	@ViewChild('popover') popover;
	isOpenPopover = false;
	dismissPopover(apply: boolean = false) {
		if (apply) {
			if (!this.formGroup.get('IDVendor').value) {
				this.isOpenPopover = false;
				this.env.showMessage('Vendor not valid!', 'danger');
				return;
			}
			this.submitAttempt = true;
			let date = this.formGroup.get('OrderDate').value;
			let obj = {
				IDBusinessPartner: this.formGroup.get('IDVendor').value,
				Name: 'From PO #' + this.formGroup.get('Id').value,
				IDStaff: this.env.user.StaffID,
				IDBranch: this.formGroup.get('IDBranch').value,
				SourceType: 'Order',
				SubType: this.paymentFormGroup.get('PaymentSubType').value,
				Type: this.paymentFormGroup.get('PaymentType').value,
				PaymentReason: this.paymentFormGroup.get('PaymentReason').value,
				DocumentDate: date,
				PostingDate: date,
				DueDate: date,
				OutgoingPaymentDetails: [this.formGroup.get('Id').value],
			};
			this.pageProvider.commonService
				.connect('POST', 'BANK/OutgoingPayment/PostFromSource', obj)
				.toPromise()
				.then((rs: any) => {
					this.env.showPrompt('Create outgoing payment successfully!', 'Do you want to navigate to outgoing payment ?').then((d) => {
						this.nav('outgoing-payment/' + rs.Id, 'forward');
						this.refresh();
					});
				})
				.catch((err) => {
					this.env.showMessage(err?.error?.Message ?? err, 'danger');
				})
				.finally(() => {
					this.submitAttempt = false;
				});
		}
		this.isOpenPopover = false;
	}
	presentPopover(event) {
		this.isOpenPopover = true;
	}

	submitOrders() {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;
		this.pageProvider
			.submitOrders(this.item, this.env, this.pageConfig)
			.then((rs: any) => {
				this.submitAttempt = false;
				this.refresh();
			})
			.catch((err) => {
				this.submitAttempt = false;
				console.log(err);
			});
	}

	delete(publishEventCode = this.pageConfig.pageName) {
		if (this.submitAttempt) {
			return;
		}
		this.submitAttempt = true;
		if (this.pageConfig.ShowDelete) {
			if (this.item.SourceType && this.item.SourceKey > 0) {
				this.pageProvider
					.deleteOrders(this.item, this.env, this.pageConfig, 'DELETE_FROM_PR')
					.then((rs: any) => {
						this.submitAttempt = false;
						this.env.showMessage('DELETE_RESULT_SUCCESS', 'success');
						this.env.publishEvent({ Code: publishEventCode });

						if (this.pageConfig.isDetailPage) {
							this.goBack();
						} else {
							this.removeSelectedItems();
						}
					})
					.catch((err) => {
						this.submitAttempt = false;
						console.log(err);
					});
			} else {
				super.delete(publishEventCode);
			}
		}
	}
}
