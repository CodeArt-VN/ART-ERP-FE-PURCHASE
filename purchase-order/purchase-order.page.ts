import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_OutgoingPaymentProvider, PURCHASE_OrderProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { FormBuilder } from '@angular/forms';
import { PURCHASE_OrderService } from '../purchase-order-service';
import { PURCHASE_QuotationService } from '../purchase-quotation.service';
import { CopyFromPurchaseQuotationToPurchaseOrder } from '../copy-from-purchase-quotation-to-purchase-order-modal/copy-from-purchase-quotation-to-purchase-order-modal.page';
import { PURCHASE_RequestService } from '../purchase-request.service';
import { PurchaseOrderModalPage } from '../purchase-request-detail/purchase-order-modal/purchase-order-modal.page';
import { SearchAsyncPopoverPage } from '../search-async-popover/search-async-popover.page';

@Component({
	selector: 'app-purchase-order',
	templateUrl: 'purchase-order.page.html',
	styleUrls: ['purchase-order.page.scss'],
	standalone: false,
})
export class PurchaseOrderPage extends PageBase {
	statusList = [];
	paymentStatusList = [];
	paymentTypeList = [];
	paymentReasonList = [];
	showRequestOutgoingPayment = false;
	constructor(
		public pageProvider: PURCHASE_OrderService,
		public sysConfigProvider: SYS_ConfigProvider,
		public outgoingPaymentProvider: BANK_OutgoingPaymentProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public formBuilder: FormBuilder,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public purchaseQuotationProvider: PURCHASE_QuotationService,
		public purchaseRequestProvider: PURCHASE_RequestService
	) {
		super();

		this.formGroup = formBuilder.group({
			PaymentType: [''],
			PaymentSubType: [''],
			PaymentReason: [''],
		});
		this.pageConfig.ShowAdd = false;
		this.pageConfig.ShowAddNew = true;
	}

	preLoadData(event) {
		this.query.Type_ne = 'PurchaseRequest';
		if (!this.sort.Id) {
			this.sort.Id = 'Id';
			this.sortToggle('Id', true);
		}
		let sysConfigQuery = ['POUsedApprovalModule'];
		Promise.all([
			this.env.getStatus('PurchaseOrder'),
			this.env.getStatus('OutgoingPaymentStatus'),
			this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch }),
			this.env.getType('PaymentType'),
			this.env.getType('OutgoingPaymentReasonType'),
		]).then((values) => {
			this.statusList = values[0];
			this.paymentStatusList = values[1];
			values[2]['data'].forEach((e) => {
				if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
					e.Value = e._InheritedConfig.Value;
				}
				this.pageConfig[e.Code] = JSON.parse(e.Value);
			});
			if (values[3]) {
				this.paymentTypeList = values[3].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
			}
			if (values[4]) {
				this.paymentReasonList = values[4];
				if (values[4].length == 0)
					this.paymentReasonList = [
						{ Name: 'Payment of invoice', Code: 'PaymentOfInvoice' },
						{ Name: 'Payment of purchase order', Code: 'PaymentOfPO' },
					];
			}
			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i.TotalAfterTaxText = lib.currencyFormat(i.TotalAfterTax);
			i.ExpectedReceiptDateText = lib.dateFormat(i.ExpectedReceiptDate, 'dd/mm/yyyy');
			i.ExpectedReceiptTimeText = lib.dateFormat(i.ExpectedReceiptDate, 'hh:MM');
			i.OrderDateText = lib.dateFormat(i.OrderDate, 'dd/mm/yyyy');
			i.OrderTimeText = lib.dateFormat(i.OrderDate, 'hh:MM');
			i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '--', 'Code');
			i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', 'dark', 'Code');
		});
		if (this.pageConfig.canSubmitOrdersForApproval) {
			this.pageConfig.canSubmit = true;
		}
		if (this.pageConfig['POUsedApprovalModule']) {
			this.pageConfig['canApprove'] = false;
		}

		super.loadedData(event);
	}

	merge() {}
	split() {}

	ngOnDestroy() {
		this.dismissPopover();
	}
	IDBusinessPartner = null;
	@ViewChild('popoverPub') popoverPub;
	isOpenPopover = false;
	dismissPopover(apply: boolean = false) {
		if (!this.isOpenPopover || !this.IDBusinessPartner) return;
		if (apply) {
			this.submitAttempt = true;
			let obj = {
				Id: 0,
				IDBranch: this.env.selectedBranch,
				IDBusinessPartner: this.IDBusinessPartner,
				Name: 'Pay for PO [' + this.selectedItems.map((d) => d.Id).join(',') + ']',
				SourceType: 'Order',
				IDStaff: this.env.user.StaffID,
				PostingDate: new Date(),
				DueDate: new Date(),
				DocumentDate: new Date(),
				SubType: this.formGroup.get('PaymentSubType').value,
				Type: this.formGroup.get('PaymentType').value,
				PaymentReason: this.formGroup.get('PaymentReason').value,
				OutgoingPaymentDetails: this.selectedItems.map((d) => d.Id),
			};
			this.outgoingPaymentProvider.commonService
				.connect('POST', 'BANK/OutgoingPayment/PostFromSource', obj)
				.toPromise()
				.then((rs: any) => {
					this.env.showPrompt('Create outgoing payment successfully!', 'Do you want to navigate to outgoing payment ?').then((d) => {
						this.nav('outgoing-payment/' + rs.Id, 'forward');
					});
					console.log(rs);
				})
				.catch((err) => {
					this.env.showMessage(err?.error?.Message ?? err, 'danger');
				})
				.finally(() => {
					this.submitAttempt = false;
				});

			// this.form.patchValue(this._reportConfig?.DataConfig);
		}
		this.isOpenPopover = false;
	}
	presentPopover(event) {
		this.isOpenPopover = true;
	}

	isOpenAddNewPopover = false;
	@ViewChild('addNewPopover') addNewPopover!: HTMLIonPopoverElement;
	presentAddNewPopover(e) {
		this.addNewPopover.event = e;
		this.isOpenAddNewPopover = !this.isOpenAddNewPopover;
	}

	ShowRequestOutgoingPayment;
	ShowSubmitForApproval;
	changeSelection(i, e = null) {
		super.changeSelection(i, e);
		const uniqueSellerIDs = new Set(this.selectedItems.map((i) => i.IDVendor));
		if (uniqueSellerIDs.size > 1) {
			this.pageConfig.ShowRequestOutgoingPayment = false;
			this.IDBusinessPartner = null;
		} else {
			this.IDBusinessPartner = [...uniqueSellerIDs][0];
		}
	}

	copyToReceipt() {
		if (!this.pageConfig.canCopyToReceipt) return;
		let obj = this.selectedItems.map((d) => {
			return { Id: d.Id };
		});

		this.pageProvider.commonService
			.connect('POST', 'PURCHASE/Order/CopyToReceipt/', obj)
			.toPromise()
			.then(async (resp: any) => {
				let messageTitle = 'Đã tạo ASN thành công : ';
				let messageSubtile = 'Nhưng có lỗi khi tạo ASN ';
				let message = '';
				let ids = [];
				let idsErr = [];
				for (const r of resp) {
					if (message != '') message += '<br>';
					if (r.Id) {
						ids.push(r.Id);
					}
					if (r.ErrorList && r.ErrorList.length) {
						if (r.Id) {
							idsErr.push(r.Id);
						}
						for (let i = 0; i < r.ErrorList.length && i <= 5; i++)
							if (i == 5) message += '<br> Còn nữa...';
							else {
								const e = r.ErrorList[i];
								const translationPromises = this.env.translateResource(e.Message);
								await translationPromises.then((translated) => {
									e.Message = translated;
								});
								message += '<br> ' + e.IDItem + ' - ' + e.Name + ': ' + e.Message;
							}
					} else {
						this.env.showMessage('ASN created!', 'Success');
					}
				}
				if (message != '') {
					this.env
						.showPrompt(
							{
								code: 'There was an error creating the ASN: {{value}}',
								value: message,
							},
							ids.length > 0 ? messageSubtile + idsErr.join(', ') : null,
							ids.length > 0 ? messageTitle + ids.join(', ') : 'Lỗi khi tạo ASN'
						)
						.then((_) => {
							// if (messageSubtile) this.nav('/receipt/' + resp.Id);
						})
						.catch((e) => {});
				} else {
					this.env.showPrompt(null, null, messageTitle + ids.join(', '));
				}
			})
			.catch((err) => {
				this.env.showMessage('Cannot create ASN, please try again later', 'danger');
			});
	}

	initPQDatasource = [];
	initPRDatasource = [];

	isOpenPurchaseOrderPopover = false;

	copyFromPurchaseQuotation(id: any) {
		// Sau khi chọn PQ thì mở modal chọn các sản phẩm từ PQ để copy sang PO
		this.env
			.showLoading('Please wait for a few moments', this.purchaseQuotationProvider.getAnItem(id, null))
			.then((data: any) => {
				this.purchaseQuotationProvider
					.copyCopyToPurchaseOrder(data, CopyFromPurchaseQuotationToPurchaseOrder, this.modalController)
					.then((data: any) => {
						if (data) {
							// this.env.showPrompt(null, 'Do you want to move to the just created PO page ?', 'PO created!').then((_) => {
							// 	this.nav('/purchase-order/' + data.Id);
							// });
							this.env.showMessage('PO created!', 'success');
							this.env.publishEvent({ Code: this.pageConfig.pageName });
							this.refresh();
						}
					})
					.catch((err) => {
						this.env.showMessage(err, 'danger');
					});
			})
			.catch((err) => {
				this.env.showMessage(err, 'danger');
			});
	}

	async openPurchaseQuotationPopover(ev: any) {
		let queryPO = {
			IDBranch: this.env.selectedBranchAndChildren,
			Take: 20,
			Skip: 0,
			Status: '["Approved"]',
		};
		let searchFn = this.buildSelectDataSource((term) => {
			return this.purchaseQuotationProvider.read({ ...queryPO, Term: term });
		}, false);

		if (this.initPQDatasource.length == 0) {
			this.purchaseQuotationProvider.read(queryPO).then(async (rs: any) => {
				if (rs && rs.data) {
					this.initPQDatasource = rs.data;
					searchFn.selected = this.initPQDatasource;
					let popover = await this.popoverCtrl.create({
						component: SearchAsyncPopoverPage,
						componentProps: {
							title: 'Purchase quotation',
							type: 'PurchaseQuotation',
							provider: this.purchaseQuotationProvider,
							query: queryPO,
							searchFunction: searchFn,
						},
						event: ev,
						cssClass: 'w300',
						translucent: true,
					});
					popover.onDidDismiss().then((result: any) => {
						console.log(result);
						if (result.data) {
							this.copyFromPurchaseQuotation(result.data.Id);
						}
					});
					return await popover.present();
				}
			});
		} else {
			searchFn.selected = this.initPQDatasource;
			let popover = await this.popoverCtrl.create({
				component: SearchAsyncPopoverPage,
				componentProps: {
					title: 'Purchase quotation',
					type: 'PurchaseQuotation',
					provider: this.purchaseQuotationProvider,
					query: queryPO,
					searchFunction: searchFn,
				},
				event: ev,
				cssClass: 'w300',
				translucent: true,
			});
			popover.onDidDismiss().then((result: any) => {
				console.log(result);
				if (result.data) {
					this.copyFromPurchaseQuotation(result.data.Id);
				}
			});
			return await popover.present();
		}
	}

	copyFromPurchaseRequest(id: any) {
		this.env.showLoading('Please wait for a few moments', this.purchaseRequestProvider.getAnItem(id, null)).then((data: any) => {
			let orderLines = data.OrderLines.filter((d) => d.Id);
			let vendorList = [];
			data.OrderLines.forEach((o) => {
				o._Vendors = o._Item?._Vendors;
				if (o.IDVendor) {
					vendorList = [...vendorList, ...o._Item._Vendors.filter((v) => v.Id == o.IDVendor && !vendorList.some((vd) => v.Id == vd.Id))];
				} else {
					vendorList = [...vendorList, ...o._Item._Vendors.filter((v) => !vendorList.some((vd) => v.Id == vd.Id))];
				}
			});
			this.purchaseRequestProvider
				.copyToPO(data.Id, orderLines, data._Vendor, vendorList, PurchaseOrderModalPage, this.modalController, this.env)
				.then((rs: any) => {
					if (rs) {
						this.env.showMessage('PO created!', 'success');
						// this.env.showPrompt('Create purchase order successfully!', 'Do you want to navigate to purchase order?').then((d) => {
						// 	this.nav('/purchase-order/' + rs.Id, 'forward');
						// });
						this.refresh();
						this.env.publishEvent({ Code: this.pageConfig.pageName });
					}
				})
				.catch((err) => {
					console.log(err);
					this.env.showMessage('Cannot create PO, please try again later', 'danger');
				});
		});
	}

	async openPurchaseRequestPopover(ev: any) {
		let queryPO = {
			IDBranch: this.env.selectedBranchAndChildren,
			Take: 20,
			Skip: 0,
			Status: '["Approved"]',
		};
		let searchFn = this.buildSelectDataSource((term) => {
			return this.purchaseRequestProvider.read({ ...queryPO, Term: term });
		}, false);

		if (this.initPRDatasource.length == 0) {
			this.purchaseRequestProvider.read(queryPO).then(async (rs: any) => {
				if (rs && rs.data) {
					this.initPRDatasource = rs.data;
					searchFn.selected = this.initPRDatasource;
					let popover = await this.popoverCtrl.create({
						component: SearchAsyncPopoverPage,
						componentProps: {
							title: 'Purchase request',
							type: 'PurchaseRequest',
							provider: this.purchaseRequestProvider,
							query: queryPO,
							searchFunction: searchFn,
						},
						event: ev,
						cssClass: 'w300',
						translucent: true,
					});
					popover.onDidDismiss().then((result: any) => {
						console.log(result);
						if (result.data) {
							this.copyFromPurchaseRequest(result.data.Id);
						}
					});
					return await popover.present();
				}
			});
		} else {
			searchFn.selected = this.initPRDatasource;
			let popover = await this.popoverCtrl.create({
				component: SearchAsyncPopoverPage,
				componentProps: {
					title: 'Purchase request',
					type: 'PurchaseRequest',
					provider: this.purchaseRequestProvider,
					query: queryPO,
					searchFunction: searchFn,
				},
				event: ev,
				cssClass: 'w300',
				translucent: true,
			});
			popover.onDidDismiss().then((result: any) => {
				console.log(result);
				if (result.data) {
					this.copyFromPurchaseRequest(result.data.Id);
				}
			});
			return await popover.present();
		}
	}

	createInvoice() {
		this.pageProvider
			.createInvoice(this.selectedItems, this.env, this.pageConfig)
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
}
