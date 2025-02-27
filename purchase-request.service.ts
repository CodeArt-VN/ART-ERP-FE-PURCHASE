import { Injectable } from '@angular/core';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PURCHASE_RequestProvider } from 'src/app/services/static/services.service';


@Injectable({ providedIn: 'root' })
export class PURCHASE_RequestService extends PURCHASE_RequestProvider {
	showCommandRules = [
		{ Status: 'Draft', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Mới
		{ Status: 'Unapproved', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Không duyệt
		{ Status: 'Submitted', ShowBtns: ['ShowApprove', 'ShowDisapprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Chờ duyệt
		{ Status: 'Approved', ShowBtns: ['ShowDisapprove', 'ShowCancel', 'ShowArchive', 'ShowCopyToPurchaseQuotation'] }, // Đã duyệt

		{ Status: 'Open', ShowBtns: ['ShowArchive'] }, // Đang xử lý
		{ Status: 'Closed', ShowBtns: ['ShowArchive'] }, // Đã xong

		{ Status: 'Splitted', ShowBtns: ['ShowArchive'] }, // Đơn đã chia
		{ Status: 'Merged', ShowBtns: ['ShowArchive'] }, // Đơn đã gộp
		{ Status: 'Canceled', ShowBtns: ['ShowArchive'] }, // Đơn đã gộp
	];

	copyToPO(items: any, env, pageConfig) {
		return new Promise((resolve, reject) => {
			let postDTO = { Ids: [] };
			let length = 0;
			let itemName = '';
			if (Array.isArray(items)) {
				postDTO.Ids = items.map((item: any) => item.Id);
				length = items.length;
			} else {
				postDTO.Ids = [items.Id];
				itemName = items.Name;
			}
			env.actionConfirm('submit', length, items?.Name, pageConfig.pageTitle, () =>
				this.commonService.connect('POST','PURCHASE/Request/CopyToPO/', postDTO).toPromise()
			)
				.then((savedItem: any) => {
					env.publishEvent({ Code: pageConfig.pageName });
					env.showMessage('Purchased ordered', 'success');
					resolve(savedItem);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}
	sendRequestQuotationToVendor(id, orderLines, currentVendor, componentModal, modalController, env) {
		return new Promise(async (resolve, reject) => {
			const modal = await modalController.create({
				component: componentModal,
				componentProps: {
					itemInVendors: orderLines,
					isMultiple: true,
					defaultVendor: currentVendor,
					// vendorList : vendorList,
				},

				cssClass: 'modal90',
			});

			await modal.present();
			const { data } = await modal.onWillDismiss();
			if (data && data.some((d) => d.Vendors.length > 0)) {
				let postData = { data: data.filter((d) => d.Vendors.length > 0) };
				env.showLoading('Please wait for a few moments', this.commonService.connect('POST', 'PURCHASE/Request/SendRequestQuotationToVendor/' + id, postData).toPromise())
					.then((resp: any) => {
						if (resp) {
							env.showMessage('Purchase quotations created!', 'success');
							resolve(resp);
						}
					})
					.catch((err) => {
						console.log(err);
						env.showMessage('Cannot create PQ, please try again later', 'danger');
						reject(err);
					});
			}
			else resolve(null);
		});
	}
}
