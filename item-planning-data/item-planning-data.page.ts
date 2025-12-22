import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PURCHASE_ItemPlanningDataProvider } from 'src/app/services/static/services.service';
import { ItemPlanningDataDetailPage } from '../item-planning-data-detail/item-planning-data-detail.page';
import { SortConfig } from 'src/app/interfaces/options-interface';

@Component({
	selector: 'app-item-planning-data',
	templateUrl: 'item-planning-data.page.html',
	styleUrls: ['item-planning-data.page.scss'],
	standalone: false,
})
export class ItemPlanningDataPage extends PageBase {
	itemsState: any = [];
	itemsView = [];
	isAllRowOpened = true;
	typeList = [];

	constructor(
		public pageProvider: PURCHASE_ItemPlanningDataProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController
	) {
		super();
		this.query.Take = 5000;
		this.query.AllChildren = true;
		this.query.AllParent = true;
	}

	preLoadData(event?: any): void {
		let sorted: SortConfig[] = [{ Dimension: 'Id', Order: 'DESC' }];
		this.pageConfig.sort = sorted;
		super.preLoadData(event);
	}

	add() {
		let newItem = {
			Id: 0,
			IsDisabled: false,
			IDItem: this.id,
			IDBranch: this.env.selectedBranch,
		};
		this.showPlanningVendorModal(newItem);
	}
	async showPlanningVendorModal(i) {
		const modal = await this.modalController.create({
			component: ItemPlanningDataDetailPage,
			componentProps: {
				item: i,
				id: i.Id,
			},
			cssClass: 'modal90',
		});
		await modal.present();
		const { data } = await modal.onDidDismiss();
		if (data) {
			this.refresh();
		}
	}
}
