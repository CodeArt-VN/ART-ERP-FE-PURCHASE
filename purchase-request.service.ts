import { Injectable } from '@angular/core';
import { PURCHASE_RequestProvider } from 'src/app/services/static/services.service';

@Injectable({ providedIn: 'root' })
export class PURCHASE_RequestService extends PURCHASE_RequestProvider {

	copyToPO(id, orderLines: any, currentVendor, vendorList, modalComponent, modalController, env) {
		return new Promise(async (resolve, reject) => {
			const modal = await modalController.create({
				component: modalComponent,
				componentProps: { orderLines: orderLines, defaultVendor: currentVendor, vendorList: vendorList },

				cssClass: 'modal90',
			});
			await modal.present();
			const { data } = await modal.onWillDismiss();
			if (data && data.IDVendor && data.OrderLines.length > 0) {
				let postData = {
					// SelectedRecommendations: this.items.filter((d) => d.checked).map((m) => ({ Id: m.Id, IDVendor: m.VendorId })),
					IDVendor: data.IDVendor,
					IDOrderlines: data.OrderLines.map((o) => o.Id),
				};
				env.showLoading('Please wait for a few moments', this.commonService.connect('POST', 'PURCHASE/Request/CopyToPO/' + id, postData).toPromise())
					.then((resp: any) => {
						if (resp) {
							resolve(resp);
						}
					})
					.catch((err) => {
						console.log(err);
						env.showMessage('Cannot create PO, please try again later', 'danger');
						reject(err);
					});
			} else resolve(null);
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
			} else resolve(null);
		});
	}
}
