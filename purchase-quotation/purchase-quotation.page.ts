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
import { CopyToPurchaseOrderModalPage } from '../copy-to-purchase-order-modal/copy-to-purchase-order-modal.page';
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
		public location: Location
	) {
		super();
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
		this.pageProvider.updatePriceList(
			this.selectedItems.map((d) => d.Id),
			PriceListVersionModalPage,
			this.modalController,
			this.env
		).then(()=>{	this.submitAttempt = false})
		.catch((err) => {this.submitAttempt = false});
	}

	copyCopyToPurchaseOrder() {
		if (this.submitAttempt) return;
		this.submitAttempt = true;
		this.pageProvider
			.getAnItem(this.selectedItems[0].Id)
			.then((data) => {
				if (data) {
					this.pageProvider
						.copyCopyToPurchaseOrder(data, CopyToPurchaseOrderModalPage, this.modalController)
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
						}).finally(() => {
							this.submitAttempt = false;
						});;
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
}
