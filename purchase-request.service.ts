import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ApiSetting } from 'src/app/services/static/api-setting';
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
				this.commonService.connect('POST', ApiSetting.apiDomain('PURCHASE/Request/CopyToPO/'), postDTO).toPromise()
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
}
