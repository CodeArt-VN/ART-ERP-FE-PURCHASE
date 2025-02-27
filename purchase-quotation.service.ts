import { Injectable } from '@angular/core';
import { PURCHASE_QuotationProvider } from 'src/app/services/static/services.service';
import { EnvService } from 'src/app/services/core/env.service';
import { ModalController, NavController } from '@ionic/angular';
import { CommonService } from 'src/app/services/core/common.service';

@Injectable({ providedIn: 'root' })
export class PURCHASE_QuotationService extends PURCHASE_QuotationProvider {
	constructor(
		public env: EnvService,
		public commonService: CommonService,
		public navCtrl: NavController,
		public modalController: ModalController
	) {
		super(commonService);
	}
	showCommandRules = [
		{ Status: 'Draft', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Mới
		{ Status: 'Unapproved', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Không duyệt
		{ Status: 'Submitted', ShowBtns: ['ShowApprove', 'ShowDisapprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Chờ duyệt
		{ Status: 'Approved', ShowBtns: ['ShowDisapprove', 'ShowCancel', 'ShowArchive', 'ShowCopyToPurchaseQuotation','ShowCopyToPurchaseOrder'] }, // Đã duyệt

		{ Status: 'Open', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Đang xử lý
		{ Status: 'Closed', ShowBtns: ['ShowArchive'] }, // Đã xong

		{ Status: 'Splitted', ShowBtns: ['ShowArchive'] }, // Đơn đã chia
		{ Status: 'Merged', ShowBtns: ['ShowArchive'] }, // Đơn đã gộp
		{ Status: 'Canceled', ShowBtns: ['ShowArchive'] }, // Đơn đã gộp
	];

	copyCopyToPurchaseOrder(item, modalComponent, modalController) {
		return new Promise(async (resolve, reject) => {
			const modal = await modalController.create({ component: modalComponent, componentProps: { _item: item }, cssClass: 'modal90' });
			await modal.present();
			const { data } = await modal.onWillDismiss();
			if (data) {
				resolve(data);
			} else {
				 resolve(null);
			}
		});
	}
}
