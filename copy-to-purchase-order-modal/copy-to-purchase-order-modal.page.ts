import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PURCHASE_OrderProvider, SALE_OrderProvider, WMS_ItemProvider, WMS_ReceiptProvider } from 'src/app/services/static/services.service';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-copy-to-purchase-order-modal',
	templateUrl: './copy-to-purchase-order-modal.page.html',
	styleUrls: ['./copy-to-purchase-order-modal.page.scss'],
	standalone: false,
})
export class CopyToPurchaseOrderModalPage extends PageBase {
	@Input() set _item(value) {
		this.item = { ...value };
	}
	formArray;
	showButtonSave = false;
	listIDASN = [];
	TotalAfterTax = 0;
	_IDItemDataSource = this.buildSelectDataSource((term) => {
		return this.itemProvider.search({
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Term: term,
		});
	});
	constructor(
		public pageProvider: PURCHASE_OrderProvider,
		public itemProvider: WMS_ItemProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,

		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.formArray = this.formBuilder.array([]);
	}

	preLoadData(event) {
		this.loadedData(event);
	}

	loadedData(event) {
		super.loadedData();
		this.item.QuotationLines = this.item.QuotationLines.map((x) => {
			return { ...x, UoMQuantityExpected: 0 };
		});
		this.item.QuotationLines.forEach((d) => {
			this.addRow(d);
			// this.listIDASN = [... this.listIDASN, ...d._Receipts.map(x=> x.IDReceipt)];
		});
		// this.listIDASN = [...new Set(this.listIDASN)];

		this._IDItemDataSource.initSearch();
		console.log(this.item);
		console.log(this.formArray);
	}

	calcTotalAfterTax(i) {
		i.controls.Total.setValue((i.controls.UoMQuantityExpected.value * i.controls.Price.value - i.controls.Discount.value) * (1 + i.controls.TaxRate.value / 100));
		this.TotalAfterTax = 0;
		this.item.QuotationLines.forEach((d) => {
			this.TotalAfterTax += d._formGroup.controls.Total.value;
		});
	}

	addRow(row: any) {
		let selectedItem = row._Item;
		// let _qtyReceipted = row._Receipts.reduce((accumulator, receipt) => {
		//   return accumulator + receipt.UoMQuantityExpected;
		// }, 0);
		row._formGroup = this.formBuilder.group({
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],
			Id: [0],
			IDItem: new FormControl({ value: row.IDItem, disabled: true }),
			IDItemUoM: new FormControl({ value: row.IDItemUoM, disabled: true }),
			// IDPO: [row.IDOrder],
			// IDPOLine: [row.Id],
			SourceLine: [row.Id],
			QuantityRequired: new FormControl({ value: row.QuantityRequired, disabled: true }),
			QuantityRemainingOpen: new FormControl({ value: row.QuantityRemainingOpen, disabled: true }),
			UoMQuantityExpected: [row.UoMQuantityExpected],
			Price: new FormControl({ value: row.Price, disabled: true }),
			Discount: new FormControl({ value: row.TotalDiscount ?? 0, disabled: true }),
			TaxRate: new FormControl({ value: row.TaxRate, disabled: true }),
			Total: new FormControl({ value: 0, disabled: true }),
		});
		this._IDItemDataSource.selected.push(selectedItem);
		this.formArray.push(row._formGroup);
	}

	toggleAllUoMQtyExpected() {
		this.item._IsShippedAll = !this.item._IsShippedAll;
		var farr = this.formArray as FormArray;
		if (this.item._IsShippedAll) {
			for (var i of farr.controls) {
				i.get('UoMQuantityExpected').setValue(i.get('QuantityRemainingOpen').value);
				i.get('UoMQuantityExpected').markAsDirty();
				this.calcTotalAfterTax(i);
			}
		} else {
			for (var i of farr.controls) {
				i.get('UoMQuantityExpected').setValue(0);
				i.get('UoMQuantityExpected').markAsDirty();
				this.calcTotalAfterTax(i);
			}
		}
		console.log('toggleAll');
	}

	toggleUoMQtyExpected(group) {
		if (group.controls.UoMQuantityExpected.value == group.controls.QuantityRemainingOpen.value) {
			group.controls.UoMQuantityExpected.setValue(0);
			group.controls.UoMQuantityExpected.markAsDirty();
			this.calcTotalAfterTax(group);
		} else {
			group.controls.UoMQuantityExpected.setValue(group.controls.QuantityRemainingOpen.value);
			group.controls.UoMQuantityExpected.markAsDirty();
			this.calcTotalAfterTax(group);
		}
	}

	qtyImportedChange(e: any) {
		if (e.controls.QuantityImport.value > e.controls.UoMQuantityExpected.value - e.controls.QuantityReceived.value)
			e.controls.QuantityImport.setValue(e.controls.UoMQuantityExpected.value - e.controls.QuantityReceived.value);
	}

	submitForm() {
		let QuotationLines = this.formArray
			.getRawValue()
			.filter((d) => d.UoMQuantityExpected > 0)
			.map((d) => {
				return {
					UoMQuantityExpected: d.UoMQuantityExpected,
					// Id: d.Id,
					// IDItem: d.IDItem,
					// IDItemUoM: d.IDItemUoM,
					SourceLine: d.SourceLine,
				};
			});
		if (!(QuotationLines.length > 0)) {
			this.modalController.dismiss(null);
			return;
		}

		let postDATA = {
			data: QuotationLines,
		};
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('POST', 'PURCHASE/Quotation/CopyToPO/' + this.item.Id, postDATA).toPromise())
			.then((result: any) => {
				this.modalController.dismiss(result);
			})
			.catch((err) => this.env.showMessage(err, 'danger'));
	}
}
