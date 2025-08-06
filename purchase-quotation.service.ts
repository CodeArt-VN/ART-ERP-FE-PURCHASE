import { Injectable } from '@angular/core';
import { PURCHASE_QuotationProvider } from 'src/app/services/static/services.service';
@Injectable({ providedIn: 'root' })
export class PURCHASE_QuotationService extends PURCHASE_QuotationProvider {
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
	async updatePriceList(ids, modalComponent, modalController, env) {
		const modal = await modalController.create({
			component: modalComponent,
			componentProps: { ids: ids },
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data) env.showMessage('Updated price success', 'success');
	}

	async updateItemPlanningData(ids, modalComponent, modalController, env) {
		const modal = await modalController.create({
			component: modalComponent,
			componentProps: { ids: ids },
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onWillDismiss();
		if (data) env.showMessage('Updated item planning data success', 'success');
	}
}
