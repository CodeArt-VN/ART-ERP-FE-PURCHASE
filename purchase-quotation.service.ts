import { Injectable } from '@angular/core';
import { PURCHASE_QuotationProvider } from 'src/app/services/static/services.service';
@Injectable({ providedIn: 'root' })
export class PURCHASE_QuotationService extends PURCHASE_QuotationProvider {
	showCommandRules = [
		{ Status: 'Draft', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Mới
		{ Status: 'Unapproved', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Không duyệt
		{ Status: 'Submitted', ShowBtns: ['ShowApprove', 'ShowDisapprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Chờ duyệt
		{ Status: 'Approved', ShowBtns: ['ShowDisapprove', 'ShowCancel', 'ShowArchive', 'ShowCopyToPurchaseQuotation','ShowCopyToPurchaseOrder','ShowAddPriceListVersion'] }, // Đã duyệt

		{ Status: 'Open', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Đang xử lý
		{ Status: 'Closed', ShowBtns: ['ShowArchive','ShowAddPriceListVersion'] }, // Đã xong

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
	async updatePriceList(ids,modalComponent,modalController,env) {
			const modal = await modalController.create({
				component: modalComponent,
				componentProps: { ids: ids },
				cssClass: 'modal90',
			});
			await modal.present();
			const { data } = await modal.onWillDismiss();
			if (data) env.showMessage('Updated price success', 'success');
		}
	
}
