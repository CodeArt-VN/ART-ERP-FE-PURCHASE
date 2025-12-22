import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PURCHASE_OrderIntervalProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { PurchaseOrderIntervalDetailPage } from '../purchase-order-interval-detail/purchase-order-interval-detail.page';
import { SortConfig } from 'src/app/interfaces/options-interface';


@Component({
	selector: 'app-purchase-order-interval',
	templateUrl: 'purchase-order-interval.page.html',
	styleUrls: ['purchase-order-interval.page.scss'],
	standalone: false,
})
export class PurchaseOrderIntervalPage extends PageBase {

	constructor(
		public pageProvider: PURCHASE_OrderIntervalProvider,
		public modalController: ModalController,
		public formBuilder: FormBuilder,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public cdr: ChangeDetectorRef
	) {
		super();
	}

	preLoadData(event?: any): void {
		let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		this.pageConfig.sort = sorted;
		super.preLoadData(event);
	}

	add(): void {
		let newItem = {
			Id: 0,
			IsDisabled: false,
		};
		this.showModal(newItem);
	}

	async showModal(i) {
		const modal = await this.modalController.create({
			component: PurchaseOrderIntervalDetailPage,
			componentProps: {
				id: i.Id,
				item: i,
				items: i.items,
			},
			cssClass: 'modal90vh',
		});
		return await modal.present();
	}

}
