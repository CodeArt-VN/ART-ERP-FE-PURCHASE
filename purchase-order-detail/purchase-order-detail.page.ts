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
import { CopyToReceiptModalPage } from '../copy-to-receipt-modal/copy-to-receipt-modal.page';

@Component({
	selector: 'app-purchase-order-detail',
	templateUrl: './purchase-order-detail.page.html',
	styleUrls: ['./purchase-order-detail.page.scss'],
	standalone: false,
})
export class PurchaseOrderDetailPage extends PageBase {
	@ViewChild('importfile') importfile: any;
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
			Term: term,
		});
	});
	paymentFormGroup: FormGroup;
	constructor(
		public pageProvider: PURCHASE_OrderProvider,
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
			copyToReceipt(item) {
				return new Promise((resolve, reject) => {
					this.commonService
						.connect('POST', ApiSetting.apiDomain('PURCHASE/Order/CopyToReceipt/'), item)
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
	print() {
		this.pageConfig['purchase-order-note'] = true;
		this.router.navigate(['/purchase-order-note/' + this.item.Id], { state: { print: true } });
	}
	preLoadData(event) {
		this.formGroup = this.formBuilder.group({
			IDBranch: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
			IDStorer: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
			IDVendor: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
			Id: new FormControl({ value: '', disabled: true }),
			Code: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
			Name: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
			// ForeignName: [''],
			Remark: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
			// ForeignRemark: [''],
			SourceKey: new FormControl({ value: '', disabled: true }),
			SourceType: new FormControl({ value: '', disabled: true }),
			OrderDate: new FormControl({ value: '', disabled: true }),
			ExpectedReceiptDate: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
			ReceiptedDate: new FormControl({ value: '', disabled: true }),
			Type: ['Regular'],
			Status: new FormControl({ value: 'Draft', disabled: true }),
			PaymentStatus: new FormControl({ value: 'NotSubmittedYet', disabled: true }),
			IsDisabled: new FormControl({ value: '', disabled: true }),
			OrderLines: this.formBuilder.array([]),
			TotalDiscount: new FormControl({ value: '', disabled: true }),
			TotalAfterTax: new FormControl({ value: '', disabled: true }),
		});
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

	loadedData(event) {
		if (this.item) {
			this.item.OrderDateText = lib.dateFormat(this.item.OrderDate, 'hh:MM dd/mm/yyyy');
			if (this.item.OrderLines) this.item.OrderLines.sort((a, b) => (a.Id > b.Id ? 1 : b.Id > a.Id ? -1 : 0));

			if (!(this.item.Status == 'Draft' || this.item.Status == 'Unapproved')) {
				this.pageConfig.canEdit = false;
			}
		}

		super.loadedData(event, true);
		this.setOrderLines();
		this.pageConfig.ShowRequestOutgoingPayment = this.pageConfig.canRequestOutgoingPayment;
		let notShowRequestOutgoingPaymentPaymentStatus = ['Unapproved', 'Paid'];
		let notShowRequestOutgoingPayment = ['Draft', 'Submitted', 'Approved', 'PORequestQuotation', 'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Canceled'];
		if (
			notShowRequestOutgoingPayment.includes(this.formGroup.get('Status').value) ||
			notShowRequestOutgoingPaymentPaymentStatus.includes(this.formGroup.get('PaymentStatus').value)
		) {
			this.pageConfig.ShowRequestOutgoingPayment = false;
		}
		this.pageConfig.ShowCopyToReceipt = this.pageConfig.canCopyToReceipt;
		let onlyShowCopyToReceipt = ['Ordered'];
		if (!onlyShowCopyToReceipt.includes(this.formGroup.get('Status').value)) this.pageConfig.ShowCopyToReceipt = false;

		if (this.item?._Vendor) {
			this._vendorDataSource.selected = [...this._vendorDataSource.selected, this.item?._Vendor];
			this._currentBusinessPartner = this.item._Vendor;
		}
		this._vendorDataSource.initSearch();
	}

	setOrderLines() {
		this.formGroup.controls.OrderLines = new FormArray([]);
		if (this.item.OrderLines?.length) {
			this.item.OrderLines.forEach((i) => {
				this.addLine(i);
			});
		}
		if (!this.pageConfig.canEdit) this.formGroup.controls.OrderLines.disable();
		// else
		//     this.addOrderLine({ IDOrder: this.item.Id, Id: 0 });
	}

	addLine(line, markAsDirty = false) {
		let groups = <FormArray>this.formGroup.controls.OrderLines;
		let preLoadItems = this.item._Items;
		let selectedItem = preLoadItems?.find((d) => d.Id == line.IDItem);

		let group = this.formBuilder.group({
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
									this.searchProvider.search({ ARSearch: true, IDPO: line.IDOrder, SortBy: ['Id_desc'], Take: 20, Skip: 0, Term: term }).pipe(
										catchError(() => of([])), // empty list on error
										tap(() => (this.loading = false))
									)
								)
							)
						);
					},
				},
			],
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : ''],

			IDOrder: [line.IDOrder],
			Id: [line.Id],
			Remark: new FormControl({
				value: line.Remark,
				disabled: !(this.pageConfig.canEdit || ((this.item.Status == 'Approved' || this.item.Status == 'Ordered') && this.pageConfig.canEditApprovedOrder)),
			}),
			IDItem: [line.IDItem, Validators.required],
			IDUoM: new FormControl({ value: line.IDUoM, disabled: !this.pageConfig.canEdit }, Validators.required),
			UoMPrice: new FormControl({ value: line.UoMPrice, disabled: !(this.pageConfig.canEdit && this.pageConfig.canEditPrice) }, Validators.required),
			SuggestedQuantity: new FormControl({ value: line.SuggestedQuantity, disabled: true }),
			UoMQuantityExpected: new FormControl({ value: line.UoMQuantityExpected, disabled: !this.pageConfig.canEdit }, Validators.required),
			QuantityAdjusted: new FormControl({
				value: line.QuantityAdjusted,
				disabled: !((this.item.Status == 'Approved' || this.item.Status == 'Ordered') && this.pageConfig.canEditApprovedOrder),
			}),
			IsPromotionItem: new FormControl({ value: line.IsPromotionItem, disabled: !this.pageConfig.canEdit }),
			TotalBeforeDiscount: new FormControl({ value: line.TotalBeforeDiscount, disabled: true }),
			TotalDiscount: new FormControl({ value: line.TotalDiscount, disabled: !this.pageConfig.canEdit }),
			TotalAfterDiscount: new FormControl({ value: line.TotalAfterDiscount, disabled: true }),
			TaxRate: new FormControl({ value: line.TaxRate, disabled: true }),
			Tax: new FormControl({ value: line.Tax, disabled: true }),
			TotalAfterTax: new FormControl({ value: line.TotalAfterTax, disabled: true }),
		});
		groups.push(group);

		group.get('_IDItemDataSource').value?.initSearch();

		if (markAsDirty) {
			group.get('IDOrder').markAsDirty();
		}
	}

	addNewLine() {
		let newLine: any = { IDOrder: this.item.Id, Id: 0 };
		this.addLine(newLine, true);
	}

	removeLine(index) {
		this.env
			.showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
			.then((_) => {
				let groups = <FormArray>this.formGroup.controls.OrderLines;
				let Ids = [];
				Ids.push({ Id: groups.controls[index]['controls'].Id.value });
				this.purchaseOrderDetailProvider.delete(Ids).then((resp) => {
					groups.removeAt(index);
					this.env.publishEvent({ Code: this.pageConfig.pageName });
					this.env.showMessage('Deleted!', 'success');
				});
			})
			.catch((_) => {});
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
		return this.formGroup.controls.OrderLines.getRawValue()
			.map((x) => (x.UoMPrice * (x.UoMQuantityExpected + x.QuantityAdjusted) - x.TotalDiscount) * (1 + x.TaxRate / 100))
			.reduce((a, b) => +a + +b, 0);
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

					this.saveOrder();
					return;
				}
			}
		}
		group.controls.UoMPrice.setValue(null);
		group.controls.UoMPrice.markAsDirty();
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
						this.pageProvider['copyToReceipt']({
							...this.item,
							...{ ...this.receiptFormGroup.getRawValue(), Status: 'Confirmed' },
						})
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
			component: CopyToReceiptModalPage,
			componentProps: { _item: this.item },
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data) {
			this.env.showPrompt(null, 'Do you want to move to the just created ASN page ?', 'ASN created!').then((_) => {
				this.nav('/receipt/' + data.Id);
			});
		}
	}

	async createInvoice() {
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Order/CopyToAPInvoice/', { Ids: [this.item.Id] }).toPromise())
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
			.catch((err) => {
				this.env.showMessage(err);
			});
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

		this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Approved');
		this.submitAttempt = true;
		let postDTO = { Ids: [] };
		postDTO.Ids = [this.item.Id];

		this.pageProvider.commonService
			.connect('POST', ApiSetting.apiDomain('PURCHASE/Order/SubmitOrders/'), postDTO)
			.toPromise()
			.then((savedItem: any) => {
				this.env.publishEvent({ Code: this.pageConfig.pageName });
				this.env.showMessage('Purchased ordered', 'success');
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.submitAttempt = false;
				console.log(err);
			});
	}
}
