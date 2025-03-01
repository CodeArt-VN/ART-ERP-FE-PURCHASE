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
import { PROD_ItemInVendorProvider, PURCHASE_QuotationProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-pricelist-version-modal',
	templateUrl: './pricelist-version-modal.page.html',
	styleUrls: ['./pricelist-version-modal.page.scss'],
	standalone: false,
})
export class PriceListVersionModalPage extends PageBase {
	@Input() ids: any;
	priceListForVendor: any;
	priceList = [];
	applyPrice = true;

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
			.connect('POST', ApiSetting.apiDomain('PURCHASE/Quotation/GetPriceListForVendor'), this.ids)
			.toPromise()
			.then((result) => {
				this.priceListForVendor = result;
				this.loadedData();
			})
			.catch((err) => {
				this.loadedData();
				this.env.showMessage(err, 'danger');
			});
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event);
		if (this.priceListForVendor?.length > 0) {
			for (let p of this.priceListForVendor) {
				let item = this.items.find((d) => d.IDBusinessPartner == p.IDBusinessPartner);
				if (item) {
					this.items = [
						...this.items,
						...p.QuotationLines.map((d) => {
							return { ...d, IDParent: item.Id };
						}),
					];
				} else {
					let id = lib.generateUID();
					this.items.push({ ...p, Id: id, Name: p.IDBusinessPartner + ' - ' + p.Name });
					this.items = [
						...this.items,
						...p.QuotationLines.map((d) => {
							return { ...d, IDParent: id };
						}),
					];
				}
			}
		}

		this.items
			.filter((d) => d.IDBusinessPartner)
			.forEach((i) => {
				let childList = this.items.filter((d) => d.IDParent == i.Id);

				const grouped = childList.reduce((acc, item) => {
					const key = `${item._Item.Id}-${item._UoM.Id}`;
					if (!acc[key]) acc[key] = [];
					acc[key].push(item);
					return acc;
				}, {});

				// Step 2: Find min price in each group and mark it
				Object.values(grouped).forEach((group: any) => {
					let minItem = group.reduce((min, item) => {
						if (item.Price != null && (min == null || item.Price < min.Price)) {
							return item;
						}
						return min;
					}, null);

					if (minItem) minItem.checked = true;
				});
			});

		lib.buildFlatTree(this.items, []).then((result: any) => {
			this.items = result;
		});
	}

	submitForm() {
		let postDATA = {
			IsApply: this.applyPrice,
			lines: this.items.filter((d) => !d.IDBusinessPartner && d.checked).map((d) => d.Id),
		};
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'Purchase/Quotation/ApplyPriceListVerson', postDATA).toPromise())
			.then((result: any) => {
				this.modal.dismiss(result);
			})
			.catch((err) => {
				console.log(err);
				this.env.showMessage('Failed', 'danger');
			});
	}

	selectItem(item: any) {
		if (item.checked) {
			this.items.filter((x) => !x.IDBusinessPartner && x != item && x.IDParent == item.IDParent && x._Item.Id == item._Item.Id).forEach((x) => (x.checked = false));
		}
	}

	checkAllVendor(e: any) {
		const minPriceItems: Record<string, any[]> = {};

		if (e.target.checked) {
			this.items
				.filter((d) => !d.IDBusinessPartner)
				.forEach((item) => {
					if ((item.Price || 0) > 0) {
						let preItem = minPriceItems[item.IDParent]?.find((d) => d._Item.Id == item._Item.Id);
						if (preItem) {
							if (item.Price < preItem.Price) {
								let index = minPriceItems[item.IDParent].indexOf(preItem);
								minPriceItems[item.IDParent].splice(index, 1, item);
							}
						} else {
							if (!minPriceItems[item.IDParent]) minPriceItems[item.IDParent] = [];

							minPriceItems[item.IDParent].push(item);
						}
					}
				});
			this.items
				.filter((d) => !d.IDBusinessPartner)
				.forEach((d) => {
					if (minPriceItems[d.IDParent]?.find((x) => x._Item.Id == d._Item.Id)) {
						d.checked = d.Price == minPriceItems[d.IDParent].find((x) => x._Item.Id == d._Item.Id).Price;
					}
				});
		} else {
			this.items
				.filter((d) => !d.IDBusinessPartner)
				.forEach((d) => {
					d.checked = false;
				});
		}
	}
}
