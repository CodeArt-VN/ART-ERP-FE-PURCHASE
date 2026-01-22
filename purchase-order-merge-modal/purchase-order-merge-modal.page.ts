import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { CRM_ContactProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
	selector: 'app-purchase-order-merge-modal',
	templateUrl: './purchase-order-merge-modal.page.html',
	styleUrls: ['./purchase-order-merge-modal.page.scss'],
	standalone: false,
})
export class PurchaseOrderMergeModalPage extends PageBase {
	@Input() selectedOrders;

	initVendorIds = [];
	hasMultipleVendors = false;
	warehouseList = [];
	warehouseListLoading = false;

	constructor(
		public pageProvider: PURCHASE_OrderProvider,
		public contactProvider: CRM_ContactProvider,

		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,

		public modalController: ModalController,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public loadingController: LoadingController,
		private config: NgSelectConfig
	) {
		super();
		this.formGroup = this.formBuilder.group({
			IDVendor: [],
			IDStorer: [],
			IDWarehouse: [],
			ExpectedReceiptDate: [null, Validators.required],
		});
		this.pageConfig.isDetailPage = false;
		this.pageConfig.pageName = 'MergePurchaseOrder';
		this.config.notFoundText = 'Không tìm thấy dữ liệu phù hợp...';
		this.config.clearAllText = 'Xóa hết';
	}

	loadData(event) {
		this.item = {
			Ids: [],
			IDVendor: null,
			IDStorer: null,
			IDWarehouse: null,
			ExpectedReceiptDate: null,
		};
		const vendorIds = [];
		const storerIds = [];
		if (this.selectedOrders) {
			this.selectedOrders.forEach((i) => {
				this.item.Ids.push(i.Id);
				const vendorId = i.IDVendor ?? i._Vendor?.Id;
				const storerId = i.IDStorer ?? i._Storer?.Id;
				if (vendorId && vendorIds.indexOf(vendorId) == -1) vendorIds.push(vendorId);
				if (storerId && storerIds.indexOf(storerId) == -1) storerIds.push(storerId);
			});
		}
		this.initVendorIds = vendorIds;
		this.hasMultipleVendors = vendorIds.length > 1;
		this.item.IDVendor = vendorIds.length ? vendorIds[0] : null;
		this.item.IDStorer = storerIds.length ? storerIds[0] : null;
		this.item.IDWarehouse = this.getSharedWarehouseId();
		this.item.ExpectedReceiptDate = this.getSharedExpectedReceiptDate();

		this.formGroup.patchValue(
			{
				IDVendor: this.item.IDVendor,
				IDStorer: this.item.IDStorer,
				IDWarehouse: this.item.IDWarehouse,
				ExpectedReceiptDate: this.item.ExpectedReceiptDate,
			},
			{ emitEvent: false }
		);
		if (this.item.IDStorer != null) {
			this.formGroup.get('IDStorer')?.markAsDirty();
		}
		if (this.item.IDVendor != null && this.hasMultipleVendors) {
			this.formGroup.get('IDVendor')?.markAsDirty();
		}
		this.loadWarehouses();
		this.loadedData(event);
	}

	loadedData(event) {
		if (this.initVendorIds.length) {
			this.contactProvider
				.read({ Id: JSON.stringify(this.initVendorIds) })
				.then((contacts: any) => {
					const selectedVendorId = this.formGroup.get('IDVendor')?.value;
					if (selectedVendorId && contacts.data?.length) {
						this.vendorSelected = contacts.data.find((d) => d.Id == selectedVendorId) || contacts.data[0];
						this.formGroup.get('IDVendor')?.setValue(this.vendorSelected?.Id ?? null, { emitEvent: false });
						this.item.IDVendor = this.vendorSelected?.Id ?? null;
					}
					contacts.data?.forEach((contact) => {
						if (contact && this.vendorListSelected.findIndex((d) => d.Id == contact.Id) == -1) {
							this.vendorListSelected.push({
								Id: contact.Id,
								Code: contact.Code,
								Name: contact.Name,
								WorkPhone: contact.WorkPhone,
								AddressLine1: contact.AddressLine1,
							});
						}
					});
				})
				.finally(() => {
					this.vendorSearch();
					this.cdr.detectChanges();
				});
		} else {
			this.vendorSearch();
		}

		super.loadedData(event);
	}

	vendorList$;
	vendorListLoading = false;
	vendorListInput$ = new Subject<string>();
	vendorListSelected = [];
	vendorSelected = null;
	vendorSearch() {
		this.vendorListLoading = false;
		this.vendorList$ = concat(
			of(this.vendorListSelected),
			this.vendorListInput$.pipe(
				distinctUntilChanged(),
				tap(() => (this.vendorListLoading = true)),
				switchMap((term) =>
					this.contactProvider
						.search({
							SkipAddress: true,
							IsVendor: true,
							SortBy: ['Id_desc'],
							Take: 20,
							Skip: 0,
							Keyword: term,
						})
						.pipe(
							catchError(() => of([])), // empty list on error
							tap(() => (this.vendorListLoading = false))
						)
				)
			)
		);
	}

	getSharedWarehouseId() {
		if (!this.selectedOrders?.length) {
			return null;
		}
		let warehouseId = null;
		for (const order of this.selectedOrders) {
			const currentId = order?.IDWarehouse;
			if (!currentId) {
				return null;
			}
			if (warehouseId === null) {
				warehouseId = currentId;
			} else if (warehouseId !== currentId) {
				return null;
			}
		}
		return warehouseId;
	}

	getSharedExpectedReceiptDate() {
		if (!this.selectedOrders?.length) {
			return null;
		}
		let expectedDate = null;
		for (const order of this.selectedOrders) {
			const current = order?.ExpectedReceiptDate;
			if (!current) {
				return null;
			}
			const currentValue = lib.dateFormat(current, 'yyyy-mm-dd');
			if (expectedDate === null) {
				expectedDate = currentValue;
			} else if (expectedDate !== currentValue) {
				return null;
			}
		}
		return expectedDate;
	}

	loadWarehouses() {
		this.warehouseListLoading = true;
		this.env
			.getWarehouses(false)
			.then((warehouses) => {
				this.warehouseList = warehouses || [];
				const sharedWarehouseId = this.getSharedWarehouseId();
				if (sharedWarehouseId && this.warehouseList.some((w) => w.Id == sharedWarehouseId)) {
					this.formGroup.get('IDWarehouse')?.setValue(sharedWarehouseId, { emitEvent: false });
					this.item.IDWarehouse = sharedWarehouseId;
				} else if (!sharedWarehouseId) {
					this.formGroup.get('IDWarehouse')?.setValue(null, { emitEvent: false });
					this.item.IDWarehouse = null;
				}
			})
			.catch(() => {
				this.warehouseList = [];
			})
			.finally(() => {
				this.warehouseListLoading = false;
				this.cdr.detectChanges();
			});
	}

	mergePurchaseOrders() {
		const formValues = this.formGroup?.getRawValue?.() ?? {};
		Object.assign(this.item, formValues);
		let publishEventCode = this.pageConfig.pageName;
		let apiPath = {
			method: 'POST',
			url: function () {
				return ApiSetting.apiDomain('PURCHASE/Order/MergeOrders/');
			},
		};

		return new Promise((resolve, reject) => {
			if (!this.item.Ids.length) {
				this.env.showMessage('Please check the orders to combine', 'warning');
			} else if (!this.item.ExpectedReceiptDate) {
				this.env.showMessage('Please select expected receipt date', 'warning');
			} else if (this.submitAttempt == false) {
				this.submitAttempt = true;

				if (!this.item.IDBranch) {
					this.item.IDBranch = this.env.selectedBranch;
				}
				this.pageProvider.commonService
					.connect(apiPath.method, apiPath.url(), this.item)
					.toPromise()
					.then((savedItem: any) => {
						if (publishEventCode) {
							this.env.publishEvent({ Code: publishEventCode });
						}
						this.env.showMessage('Saving completed!', 'success');
						resolve(savedItem.Id);
						this.submitAttempt = false;
						this.modalController.dismiss({ saved: true, id: savedItem.Id });
					})
					.catch((err) => {
						this.env.showMessage('Cannot save, please try again', 'danger');
						this.cdr.detectChanges();
						this.submitAttempt = false;
						reject(err);
					});
			}
		});
	}

	changedIDVendor(i) {
		if (i) {
			const vendor = typeof i === 'object' ? i : this.vendorListSelected.find((d) => d.Id == i);
			this.vendorSelected = vendor || null;
			if (vendor && this.vendorListSelected.findIndex((d) => d.Id == vendor.Id) == -1) {
				this.vendorListSelected.push(vendor);
				this.vendorSearch();
			}
		} else {
			this.vendorSelected = null;
		}
	}
}
