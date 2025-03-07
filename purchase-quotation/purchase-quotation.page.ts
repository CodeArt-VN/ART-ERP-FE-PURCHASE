import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PriceListVersionModalPage } from '../pricelist-version-modal/pricelist-version-modal.page';
import { PURCHASE_QuotationService } from '../purchase-quotation.service';
import { CopyFromPurchaseQuotationToPurchaseOrder } from '../copy-from-purchase-quotation-to-purchase-order-modal/copy-from-purchase-quotation-to-purchase-order-modal.page';
import { PURCHASE_RequestService } from '../purchase-request.service';
import { PurchaseQuotationModalPage } from '../purchase-request-detail/purchase-quotation-modal/purchase-quotation-modal.page';
import { SearchAsyncPopoverPage } from '../search-async-popover/search-async-popover.page';
@Component({
	selector: 'app-purchase-quotation',
	templateUrl: 'purchase-quotation.page.html',
	styleUrls: ['purchase-quotation.page.scss'],
	standalone: false,
})
export class PurchaseQuotationPage extends PageBase {
	statusList: any = [];
	isOpenCopyPopover: boolean = false;
	constructor(
		public pageProvider: PURCHASE_QuotationService,
		public sysConfigProvider: SYS_ConfigProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location,
		public purchaseRequestProvider: PURCHASE_RequestService
	) {
		super();
		this.pageConfig.ShowAdd = false;
		this.pageConfig.ShowAddNew = true;
	}

	preLoadData(event) {
		Promise.all([this.env.getStatus('PurchaseQuotation')]).then((values) => {
			this.statusList = values[0];
			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Code == i.Status);
		});
		super.loadedData(event);
		console.log(this.items);
	}

	updatePriceList() {
		if (this.submitAttempt) return;
		this.submitAttempt = true;
		this.pageProvider
			.updatePriceList(
				this.selectedItems.map((d) => d.Id),
				PriceListVersionModalPage,
				this.modalController,
				this.env
			)
			.then(() => {
				this.submitAttempt = false;
			})
			.catch((err) => {
				this.submitAttempt = false;
			});
	}

	copyCopyToPurchaseOrder() {
		if (this.submitAttempt) return;
		this.submitAttempt = true;
		this.pageProvider
			.getAnItem(this.selectedItems[0].Id)
			.then((data) => {
				if (data) {
					this.pageProvider
						.copyCopyToPurchaseOrder(data, CopyFromPurchaseQuotationToPurchaseOrder, this.modalController)
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
						})
						.finally(() => {
							this.submitAttempt = false;
						});
				}
			})
			.catch((err) => {
				this.env.showMessage(err, 'danger');
			})
			.finally(() => {
				this.submitAttempt = false;
			});
	}

	@ViewChild('copyPopover') copyPopover!: HTMLIonPopoverElement;
	presentCopyPopover(e) {
		this.copyPopover.event = e;
		this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}

	isOpenAddNewPopover = false;
	@ViewChild('addNewPopover') addNewPopover!: HTMLIonPopoverElement;
	presentAddNewPopover(e) {
		this.addNewPopover.event = e;
		this.isOpenAddNewPopover = !this.isOpenAddNewPopover;
	}
	initDatasource = [];
	async openPurchaseRequestPopover(ev: any) {
		let queryPR = {
			IDBranch: this.env.selectedBranchAndChildren,
			Take: 20,
			Skip: 0,
			Status: '["Approved"]',
		};
		let searchFn = this.buildSelectDataSource((term) => {
			return this.purchaseRequestProvider.search({ ...queryPR, Term: term });
		}, false);

		if (this.initDatasource.length == 0) {
			this.purchaseRequestProvider.read(queryPR).then(async (rs: any) => {
				if (rs && rs.data) {
					this.initDatasource = rs.data;
					searchFn.selected = this.initDatasource;
					let popover = await this.popoverCtrl.create({
						component: SearchAsyncPopoverPage,
						componentProps: {
							title: 'Purchase request',
							type: 'PurchaseRequest',
							provider: this.purchaseRequestProvider,
							query: queryPR,
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
			searchFn.selected = this.initDatasource;
			let popover = await this.popoverCtrl.create({
				component: SearchAsyncPopoverPage,
				componentProps: {
					title: 'Purchase request',
					type: 'PurchaseRequest',
					provider: this.purchaseRequestProvider,
					query: queryPR,
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

	copyFromPurchaseRequest(id: any) {
		this.env
			.showLoading('Please wait for a few moments', this.purchaseRequestProvider.getAnItem(id, null))
			.then((data: any) => {
				let orderLines = data.OrderLines.filter((d) => d.Id);
				orderLines.forEach((d) => (d._Vendors = d._Item._Vendors));
				this.purchaseRequestProvider
					.sendRequestQuotationToVendor(data.Id, orderLines, data.IDVendor, PurchaseQuotationModalPage, this.modalController, this.env)
					.then((rs) => {
						if (rs) {
							this.env.showMessage('Purchase quotations created!', 'success');
							this.refresh();
							this.env.publishEvent({
								Code: this.pageConfig.pageName,
							});
						}
					});
			})
			.catch((err) => {
				console.log(err);
				if(err.error?.Message)this.env.showMessage(err.error.Message, 'danger');
				else this.env.showMessage('Cannot create PQ, please try again later', 'danger');
			});
	}

	open() {
		let Ids = this.selectedItems.map(d=>d.Id);
		this.env
			.actionConfirm('SendQuotationRequest', this.selectedItems.length, this.item?.Name, this.pageConfig.pageTitle, () =>
				this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/Open/', { Ids: Ids }).toPromise()
			)
			.then((x) => {
				this.env.showMessage('Reopened', 'success');
				this.env.publishEvent({ Code: this.pageConfig.pageName });
				this.refresh();
			})
			.catch((x) => {
				//this.env.showMessage('Failed', 'danger');
			});
	}
}
