import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { diffDates } from '@fullcalendar/core/internal';
import { ModalController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { PROD_ItemInVendorProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-purchase-quotation-modal',
	templateUrl: './purchase-quotation-modal.page.html',
	styleUrls: ['./purchase-quotation-modal.page.scss'],
	standalone: false,
})
export class PurchaseQuotationModalPage extends PageBase {
	@Input() itemInVendors: any;
	@Input() isMultiple: any = false;
	@Input() defaultVendor: any;
	vendorList: any = [];
	formGroup;
	constructor(
		public modal: ModalController,
		public itemInVendorProvider: PROD_ItemInVendorProvider,
		public route: ActivatedRoute,
		public router: Router,
		public navCtrl: NavController,
		public env: EnvService,
		public pageProvider: PROD_ItemInVendorProvider,
		public formBuilder: FormBuilder
	) {
		super();
		this.formGroup = this.formBuilder.group({
			IDVendor: new FormControl({ value: '', disabled: true }),
		});
	}

	preLoadData(event?: any): void {
		// if (this.itemInVendors){

		//   this.query.IDItem = this.itemInVendors.map(d=> d.IDItem);
		// }
		// super.preLoadData();
		this.loadData(event);
	}

	loadData(event?: any): void {
		this.loadedData();
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event);
		console.log(this.items);
		let list = [...this.itemInVendors];
		list.forEach((x) => {
			let index = this.itemInVendors.indexOf(x);
			this.vendorList = [...this.vendorList, ...x._Vendors];
			this.itemInVendors.splice(
				index + 1,
				0,
				...x._Vendors.map((d) => {
					return { ...d, checked: true, _IDItem: x.IDItem };
				})
			);
		});
		this.itemInVendors = this.itemInVendors?.map((d) => {
			if (d.IDVendor == null) {
				// d._Vendors.forEach((v) => {
				//   v.checked = true;
				//   this.vendorList.push(v);
				// }); //= (v.Id == d.IDVendor)
				return { ...d, Quantity: d.Quantity, UoMName: d.UoMName, IDDetail: d.IDDetail, UoMPrice: d.UoMPrice };
			} else {
				// d._Vendors = d._Vendors.filter((v) => v.Id == d.IDVendor);
				// d._Vendors.forEach((v) => {
				//   v.checked = true;
				//   this.vendorList.push(v);
				// }); //= (v.Id == d.IDVendor)
				return { ...d, Quantity: d.Quantity, UoMName: d.UoMName, IDDetail: d.IDDetail, UoMPrice: d.UoMPrice };
			}
			return d;
		});
		this.vendorList = [...new Set(this.vendorList)];
		this.formGroup.controls.IDVendor.setValue(this.defaultVendor?.Id);
		this.items = this.itemInVendors;

		console.log(this.items);
	}

	changeVendor(i, index) {
		if (!this.isMultiple) {
			if (i._Vendors[index].checked) {
				i._Vendors.forEach((d) => (d.checked = false));
				i._Vendors[index].checked = true;
			}
		}
	}

	checkAllVendor(event: any) {
		const isChecked = event.target.checked;
		this.items.filter((d) => !d.IDItem).forEach((d) => (d.checked = isChecked));
	}

	submitForm() {
		let data = this.items
			.filter((d) => d.IDItem)
			.map((d) => {
				return {
					IDItem: d.IDItem,
					IDUoM: d.IDItemUoM,
					Vendors: this.items.filter((x) => x._IDItem == d.IDItem && x.checked).map((v) => v.Id),
				};
			});
		// let obj = this.itemInVendors.map((d) => {
		//   return {
		//     IDItem: d.IDItem,
		//     IDUoM: d.IDItemUoM,
		//     Vendors: d._Vendors.filter((d) => d.checked).map((v) => v.Id),
		//   };
		// });
		console.log(data);

		this.modal.dismiss(data);
	}
}
