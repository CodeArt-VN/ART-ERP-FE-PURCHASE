import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PURCHASE_OrderProvider, SALE_OrderProvider, SYS_ConfigProvider, WMS_ItemProvider, WMS_ReceiptProvider } from 'src/app/services/static/services.service';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-copy-from-purchase-order-to-receipt-modal',
	templateUrl: './copy-from-purchase-order-to-receipt-modal.page.html',
	styleUrls: ['./copy-from-purchase-order-to-receipt-modal.page.scss'],
	standalone: false,
})
export class CopyFromPurchaseOrderToReceiptModalPage extends PageBase {
	@Input() set _item(value) {
		this.item = { ...value };
	}
	formArray;
	branchList;
	showButtonSave = false;
	listIDASN = [];
	_IDItemDataSource = this.buildSelectDataSource((term) => {
		return this.itemProvider.search({
			SortBy: ['Id_desc'],
			Take: 20,
			Skip: 0,
			Keyword: term
		});
	});
	constructor(
		public pageProvider: PURCHASE_OrderProvider,
		public receiptProvider: WMS_ReceiptProvider,
		public itemProvider: WMS_ItemProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public sysConfigProvider: SYS_ConfigProvider,

		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController
	) {
		super();
		this.formGroup = this.formBuilder.group({
			IDWarehouse: [this.item?.IDWarehouse, Validators.required],
		});
		this.formArray = this.formBuilder.array([]);
	}

	preLoadData(event) {
		this.branchList = [...this.env.branchList];
		if (!this.item.IDWarehouse) {
			let sysConfigQuery = ['IDWarehouse'];
			this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch }).then((res: any) => {
				if (res && res['data']) {
					res['data'].forEach((e) => {
						if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
							e.Value = e._InheritedConfig.Value;
						}
						this.item.IDWarehouse = JSON.parse(e.Value);
					});
				}
			this.loadedData(event);
		});
		} else this.loadedData(event);
	}

	loadedData(event) {
		super.loadedData();
		this.item.OrderLines = this.item.OrderLines.map((x) => {
			return { ...x, QuantityImport: 0 };
		});
		this.item.OrderLines.forEach((d) => {
			this.addRow(d);
			this.listIDASN = [...this.listIDASN, ...d._Receipts.map((x) => x.IDReceipt)];
		});
		this.listIDASN = [...new Set(this.listIDASN)];
		this._IDItemDataSource.selected = [...this.item._Items];
		this._IDItemDataSource.initSearch();
		this.formGroup.get('IDWarehouse').setValue(this.item.IDWarehouse);

	}
	changeWarehouse() {}
	addRow(row: any) {
		let selectedItem = this.item._Items.find((d) => d.Id == row.IDItem);
		let _qtyReceipted = row._Receipts.reduce((accumulator, receipt) => {
			return accumulator + receipt.UoMQuantityExpected;
		}, 0);
		row._formGroup = this.formBuilder.group({
			_IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],
			Id: [0],
			IDItem: new FormControl({ value: row.IDItem, disabled: true }),
			IDUoM: new FormControl({ value: row.IDUoM, disabled: true }),
			IDPO: [row.IDOrder],
			IDPOLine: [row.Id],
			UoMQuantityExpected: new FormControl({ value: row.UoMQuantityExpected, disabled: true }),
			QuantityReceived: new FormControl({ value: _qtyReceipted, disabled: true }),
			QuantityImport: new FormControl({ value: row.QuantityImport, disabled: row.UoMQuantityExpected - _qtyReceipted == 0 }),
			Lottable5: ['2021-01-01'],
			Lottable6: ['2099-01-01'],
			Lottable0: ['-'],
		});
		if (row.UoMQuantityExpected - _qtyReceipted != 0) {
			this.showButtonSave = true;
		}
		this.formArray.push(row._formGroup);
	}

	toggleAllShippedQty() {
		this.item._IsShippedAll = !this.item._IsShippedAll;
		var farr = this.formArray as FormArray;
		if (this.item._IsShippedAll) {
			for (var i of farr.controls) {
				i.get('QuantityImport').setValue(i.get('UoMQuantityExpected').value - i.get('QuantityReceived').value);
				i.get('QuantityImport').markAsDirty();
			}
		} else {
			for (var i of farr.controls) {
				i.get('QuantityImport').setValue(0);
				i.get('QuantityImport').markAsDirty();
			}
		}
		console.log('toggleAll');
	}

	toggleShippedQty(group) {
		if (group.controls.UoMQuantityExpected.value - group.controls.QuantityReceived.value == group.controls.QuantityImport.value) {
			group.controls.QuantityImport.setValue(0);
			group.controls.QuantityImport.markAsDirty();
		} else {
			group.controls.QuantityImport.setValue(group.controls.UoMQuantityExpected.value - group.controls.QuantityReceived.value);
			group.controls.QuantityImport.markAsDirty();
		}
	}

	qtyImportedChange(e: any) {
		if (e.controls.QuantityImport.value > e.controls.UoMQuantityExpected.value - e.controls.QuantityReceived.value)
			e.controls.QuantityImport.setValue(e.controls.UoMQuantityExpected.value - e.controls.QuantityReceived.value);
	}

	submitForm() {
		if (!this.formGroup.valid) {
			this.env.showMessage('Please fill in all required fields.', 'danger');
			return;
		}
		let OrderLines = this.formArray
			.getRawValue()
			.filter((d) => d.QuantityImport > 0)
			.map((d) => {
				return {
					UoMQuantityExpected: d.QuantityImport,
					Lottable5: d.Lottable5,
					Lottable6: d.Lottable6,
					Lottable0: d.Lottable0,
					Id: d.Id,
					IDItem: d.IDItem,
					IDUoM: d.IDUoM,
					IDPO: d.IDPO,
					IDPOLine: d.IDPOLine,
				};
			});
		if (!(OrderLines.length > 0)) {
			this.modalController.dismiss(null);
			return;
		}
		let expectedReceiptDatethis = this.item.ExpectedReceiptDate;
		if (!expectedReceiptDatethis) {
			let orderDate = new Date(this.item.OrderDate);
			orderDate.setDate(orderDate.getDate() + 1);
			expectedReceiptDatethis = orderDate.toISOString();
		}
		let data = {
			//IDBranch: this.item.IDBranch,
			IDBranch: this.formGroup.get('IDWarehouse').value,
			IDVendor: this.item._Vendor.Id,
			IDStorer: this.item._Storer.Id,
			IDPurchaseOrder: this.item.Id,
			ExpectedReceiptDate: expectedReceiptDatethis,
			Type: 'FromPO',
			POCode: this.item.Code,
			Lines: OrderLines,
		};
		this.env.showLoading('Please wait for a few moments', this.receiptProvider.commonService.connect('POST', 'WMS/Receipt', data).toPromise()).then((result: any) => {
			this.modalController.dismiss(result);
		});
	}
}
