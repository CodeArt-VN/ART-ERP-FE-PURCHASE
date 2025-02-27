import { Injectable } from '@angular/core';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PURCHASE_OrderProvider } from 'src/app/services/static/services.service';

@Injectable({ providedIn: 'root' })
export class PURCHASE_OrderService extends PURCHASE_OrderProvider {
	submitOrders(items: any, env, pageConfig) {
		return new Promise((resolve, reject) => {
			let postDTO = { Ids: [] };
            let length = 0;
            let itemName = '';
			if (Array.isArray(items)) {
				postDTO.Ids = items.map((item: any) => item.Id);
                length = items.length;
			} else {
				postDTO.Ids = [items.Id];
                itemName = items.Name
			}
			env.actionConfirm('submit', length, items?.Name, pageConfig.pageTitle, () =>
				this.commonService.connect('POST', ApiSetting.apiDomain('PURCHASE/Order/SubmitOrders/'), postDTO).toPromise()
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
