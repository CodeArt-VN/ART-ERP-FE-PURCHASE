import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { diffDates } from '@fullcalendar/core/internal';
import { ModalController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import { PURCHASE_QuotationProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-item-planning-data-modal',
	templateUrl: './item-planning-data-modal.page.html',
	styleUrls: ['./item-planning-data-modal.page.scss'],
	standalone: false,
})
export class ItemPlanningDataModalPage extends PageBase {
	ids;

	itemsVendor: any = [];
	constructor(
		public modal: ModalController,
		public pageProvider: PURCHASE_QuotationProvider,
		public route: ActivatedRoute,
		public router: Router,
		public navCtrl: NavController,
		public env: EnvService,
		public formBuilder: FormBuilder
	) {
		super();
	}

	preLoadData(event?: any): void {
		this.loadData(event);
	}
	loadData(event?: any): void {
		let postDTO = { Ids: [] };
		postDTO.Ids = this.ids;
		this.pageProvider.commonService
			.connect('POST', ApiSetting.apiDomain('PURCHASE/Quotation/GetQuotaionLines'), this.ids)
			.toPromise()
			.then((result) => {
				this.itemsVendor = result;
				this.loadedData();
			})
			.catch((err) => {
				this.loadedData();
				// this.env.showMessage(err, 'danger');
			});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event);

		if (this.itemsVendor?.length > 0) {
			for (let p of this.itemsVendor) {
				let item = this.items.find((d) => d.IDBusinessPartner == p.IDBusinessPartner);
				const distinctLines = p.QuotationLines.reduce((acc, current) => {
					if (!acc.some((item) => item.IDItem === current.IDItem)) {
						acc.push(current);
					}
					return acc;
				}, []);
				if (item) {
					this.items = [
						...this.items,
						...distinctLines.map((d) => {
							return { ...d, IDParent: item.Id };
						}),
					];
				} else {
					let id = lib.generateUID();
					this.items.push({ ...p, Id: id, Name: p.IDBusinessPartner + ' - ' + p.Name });
					this.items = [
						...this.items,
						...distinctLines.map((d) => {
							return { ...d, IDParent: id };
						}),
					];
				}
			}
		}
		lib.buildFlatTree(this.items, []).then((result: any) => {
			this.items = result;
		});
	}

	submitForm() {
		this.env
			.showLoading(
				'Please wait for a few moments',
				this.pageProvider.commonService
					.connect(
						'POST',
						'Purchase/Quotation/UpdateMinimumOrderQty',
						this.items.filter((d) => d.checked).map((d) => d.Id)
					)
					.toPromise()
			)
			.then((result: any) => {
				this.modal.dismiss(result);
			});
	}

	selectItem(item: any) {
		if (item.checked) {
			this.items.filter((x) => !x.IDBusinessPartner && x != item && x.IDParent == item.IDParent && x._Item.Id == item._Item.Id).forEach((x) => (x.checked = false));
		}
	}

	checkAll(e: any) {
		this.items
			.filter((d) => !d.IDBusinessPartner)
			.forEach((d) => {
				d.checked = e.target.checked;
			});
	}
}
