import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, CRM_ContactProvider, WMS_ItemProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
@Component({
	selector: 'app-purchase-order-modal',
	templateUrl: './purchase-order-modal.page.html',
	styleUrls: ['./purchase-order-modal.page.scss'],
	standalone: false,
})
export class PurchaseOrderModalPage extends PageBase {
	storerList = [];
	branchList = [];
	preloadIDVendors: any;
	defaultVendor;
	orderLines;
	vendorList = [];

	constructor(
		public pageProvider: PURCHASE_OrderProvider,
		public contactProvider: CRM_ContactProvider,
		public itemProvider: WMS_ItemProvider,
		public branchProvider: BRA_BranchProvider,
		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef
	) {
		super();

		this.pageConfig.isDetailPage = true;

		this.formGroup = formBuilder.group({
			IDVendor: ['', Validators.required],
		});
	}

	preLoadData(event?: any): void {
		this.id = 0;

		this.loadedData(event);
	}
	loadedData(event) {
		super.loadedData(event);
		this.orderLines = [...this.orderLines];
		if (this.defaultVendor?.Id) {
			this.formGroup.get('IDVendor').setValue(this.defaultVendor.Id);
			this.orderLines.forEach((i) => {
				const canSelect = this.canSelectVendor(i, this.defaultVendor.Id) && i.QuantityRemainingOpen > 0;
				i.disabled = !canSelect;
				i.checked = canSelect;
				super.changeSelection(i);
			});
		}
	}

	copyToPO() {
		this.formGroup.updateValueAndValidity();
		if (!this.formGroup.valid) {
			this.env.showMessage('Please recheck information highlighted in red above', 'warning');
		} else {
			let submitItem: any = this.formGroup.value;
			let orderLines = this.orderLines.filter((i) => i.checked && !i.disabled && i.QuantityRemainingOpen > 0);
			if (!orderLines.length) {
				this.env.showMessage('There are no items to add to the purchase order', 'warning');
				return;
			}
			submitItem.OrderLines = orderLines;
			this.modalController.dismiss(submitItem);
		}
	}

	isAllChecked = false;
	toggleSelectAll() {
		this.isAllChecked = !this.isAllChecked;
		this.selectedItems = [];
		// let groups = this.formGroup.get('OrderLines') as FormArray;
		this.orderLines.forEach((i) => {
			if (i.disabled) {
				i.checked = false;
			} else if (this.isAllChecked) {
				i.checked = true;
			} else {
				i.checked = false;
			}
			super.changeSelection(i);
		});
		// this.selectedItems = this.isAllChecked ? [...this.items.filter(d=> d.checked)] : [];
	}
	changeVendor(e) {
		this.selectedItems = [];
		this.orderLines.forEach((i) => {
			i.checked = false;
			i.disabled = false;
		});

		setTimeout(() => {
			this.orderLines.forEach((i) => {
				const canSelect = this.canSelectVendor(i, e.Id) && i.QuantityRemainingOpen > 0;
				i.disabled = !canSelect;
				i.checked = canSelect;
				super.changeSelection(i);
			});
		}, 10);
	}
	changeSelection(i, e = null) {
		i.checked = !i.checked;
		super.changeSelection(i);
	}

	canSelectVendor(orderLine, vendorId: number) {
		if (!vendorId) return false;
		if (orderLine.IDVendor) return orderLine.IDVendor == vendorId;
		return !!orderLine._Vendors?.some((v) => v.Id == vendorId);
	}

	//TODO: Remove empty functions
	isAllSelected = false;
}
