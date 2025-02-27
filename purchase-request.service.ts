import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { PURCHASE_RequestProvider } from 'src/app/services/static/services.service';
import { EnvService } from 'src/app/services/core/env.service';
import { CommonService } from 'src/app/services/core/common.service';
import { LoadingController, ModalController, NavController } from '@ionic/angular';
import { PurchaseOrderModalPage } from './purchase-request-detail/purchase-order-modal/purchase-order-modal.page';
import { PurchaseQuotationModalPage } from './purchase-request-detail/purchase-quotation-modal/purchase-quotation-modal.page';

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
