import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PriceListVersionModalPage } from '../pricelist-version-modal/pricelist-version-modal.page';
import { PURCHASE_QuotationService } from '../purchase-quotation.service';
@Component({
	selector: 'app-purchase-quotation',
	templateUrl: 'purchase-quotation.page.html',
	styleUrls: ['purchase-quotation.page.scss'],
	standalone: false,
})
export class PurchaseQuotationPage extends PageBase {
	statusList: any = [];
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
		super.preLoadData(event);
		this.query.Type = 'PurchaseRequest';
		if (!this.sort.Id) {
			this.sort.Id = 'Id';
			this.sortToggle('Id', true);
		}
		let sysConfigQuery = ['PRUsedApprovalModule'];
		Promise.all([this.env.getStatus('PurchaseQuotation'), this.sysConfigProvider.read({ Code_in: sysConfigQuery })]).then((values) => {
			this.statusList = values[0];
			values[1]['data'].forEach((e) => {
				if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
					e.Value = e._InheritedConfig.Value;
				}
				this.pageConfig[e.Code] = JSON.parse(e.Value);
			});
			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i.RequestBranchName = this.env.branchList.find((d) => d.Id == i.IDRequestBranch)?.Name;
			i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '--', 'Code');
			i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', 'dark', 'Code');
		});
		super.loadedData(event);
		console.log(this.items);
	}

	submitForApproval() {
		if (this.submitAttempt) return;
		this.env
			.showPrompt(
				{
					code: 'Bạn có chắc muốn gửi duyệt {{value}} báo giá đang chọn?',
					value: this.selectedItems.length,
				},
				null,
				{ code: 'Gửi duyệt {{value}} báo giá', value: this.selectedItems.length }
			)
			.then((_) => {
				this.submitAttempt = true;
				let postDTO = { Ids: [] };
				postDTO.Ids = this.selectedItems.map((e) => e.Id);

				this.pageProvider.commonService
					.connect('POST', ApiSetting.apiDomain('PURCHASE/Quotation/Submit/'), postDTO)
					.toPromise()
					.then((savedItem: any) => {
						this.env.publishEvent({
							Code: this.pageConfig.pageName,
						});
						this.submitAttempt = false;

						if (savedItem > 0) {
							this.env.showMessage('{{value}} orders sent for approval', 'success', savedItem);
						} else {
							this.env.showMessage('Please check again, orders must have at least 1 item to be approved', 'warning');
						}
					})
					.catch((err) => {
						this.submitAttempt = false;
						console.log(err);
					});
			});
	}

	approve() {
		if (this.submitAttempt) return;

		this.env
			.showPrompt({ code: 'Bạn có chắc muốn DUYỆT {{value}} báo giá đang chọn?', value: this.selectedItems.length }, null, {
				code: 'Duyệt {{value}} báo giá',
				value: this.selectedItems.length,
			})
			.then((_) => {
				this.submitAttempt = true;
				let postDTO = { Ids: [] };
				postDTO.Ids = this.selectedItems.map((e) => e.Id);

				this.pageProvider.commonService
					.connect('POST', ApiSetting.apiDomain('PURCHASE/Quotation/Approve/'), postDTO)
					.toPromise()
					.then((savedItem: any) => {
						this.env.publishEvent({
							Code: this.pageConfig.pageName,
						});
						this.submitAttempt = false;

						if (savedItem > 0) {
							this.env.showMessage('{{value}} orders approved', 'success', savedItem);
						} else {
							this.env.showMessage('Please check again, orders must have at least 1 item to be approved', 'warning');
						}
					})
					.catch((err) => {
						this.submitAttempt = false;
						console.log(err);
					});
			});
	}

	disapprove() {
		if (this.submitAttempt) return;
		this.env
			.showPrompt({ code: 'Bạn có chắc muốn không duyệt {{value}} báo giá đang chọn?', value: this.selectedItems.length }, null, {
				code: 'Không phê duyệt {{value}} báo giá',
				value: this.selectedItems.length,
			})
			.then((_) => {
				this.submitAttempt = true;
				let postDTO = { Ids: [] };
				postDTO.Ids = this.selectedItems.map((e) => e.Id);

				this.pageProvider.commonService
					.connect('POST', ApiSetting.apiDomain('PURCHASE/Quotation/Disapprove/'), postDTO)
					.toPromise()
					.then((savedItem: any) => {
						this.env.publishEvent({
							Code: this.pageConfig.pageName,
						});
						this.env.showMessage('Saving completed!', 'success');
						this.submitAttempt = false;
					})
					.catch((err) => {
						this.submitAttempt = false;
						console.log(err);
					});
			});
	}

	// cancel() {
	// 	if (this.submitAttempt) return;

	// 	this.env
	// 		.showPrompt({ code: 'Bạn có chắc muốn HỦY {{value}} báo giá đang chọn?', value: this.selectedItems.length }, null, {
	// 			code: 'Huỷ {{value}} báo giá',
	// 			value: this.selectedItems.length,
	// 		})
	// 		.then((_) => {
	// 			this.submitAttempt = true;
	// 			let postDTO = { Ids: [] };
	// 			postDTO.Ids = this.selectedItems.map((e) => e.Id);

	// 			this.pageProvider.commonService
	// 				.connect('POST', ApiSetting.apiDomain('PURCHASE/Quotation/Cancel/'), postDTO)
	// 				.toPromise()
	// 				.then((savedItem: any) => {
	// 					this.env.publishEvent({
	// 						Code: this.pageConfig.pageName,
	// 					});
	// 					this.env.showMessage('Saving completed!', 'success');
	// 					this.submitAttempt = false;
	// 				})
	// 				.catch((err) => {
	// 					this.submitAttempt = false;
	// 					console.log(err);
	// 				});
	// 		});
	// }

	async updatePriceList() {
		const modal = await this.modalController.create({
			component: PriceListVersionModalPage,
			componentProps: { ids: this.selectedItems.map((d) => d.Id) },
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data) this.env.showMessage('Updated price success', 'success');
	}
}
