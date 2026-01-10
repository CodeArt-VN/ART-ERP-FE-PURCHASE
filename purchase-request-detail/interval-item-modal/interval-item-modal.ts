import { Component, Input } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { debounceTime, switchMap, from, Subject } from 'rxjs';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { FormManagementService } from 'src/app/services/page/form-management.service';
import { PURCHASE_OrderIntervalProvider, PURCHASE_RequestProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-interval-item',
	templateUrl: './interval-item-modal.html',
	styleUrls: ['./interval-item-modal.scss'],
	standalone: false,
})
export class IntervalItemModalComponent extends PageBase {
	private searchTrigger$ = new Subject<void>();
	@Input() IDPurchaseRequest: number;
	@Input() RequiredDate: any;
	intervalList = [];
	intervalDataSource: any;
	searchItemDataSource: any;
	formManagementService = new FormManagementService();
	isSearching = false;
	_IDVendor = null;
	isCheckAll=false;
	// ----- Các biến binding cho view -----
	btnAmounts: number[] = [];
	changeAmount: number = 0;
	payment: any;
	constructor(
		public modalController: ModalController,
		private formBuilder: FormBuilder,
		private intervalOrderProvider: PURCHASE_OrderIntervalProvider,
		private purchaseRequestProvider: PURCHASE_RequestProvider,
		public env: EnvService

	) {
	super();
		this.formGroup = this.formBuilder.group({
			IDBranch: [this.env.selectedBranch],
			IDInterval: [''],
			IntervalName: [''],
			Keyword: [''],
			OrderLines: [[]],
		});
	}

	ngAfterViewInit() {
		setTimeout(() => (this.pageConfig.isShowSearch = true));
	}

	ngOnInit() {
		this.intervalDataSource = this.formManagementService.createSelectDataSource((term) => {
			return this.intervalOrderProvider.search({ Take: 20, Keyword: term });
		});
		this.searchTrigger$
			.pipe(
				debounceTime(500),
				switchMap(() => {
					this.isSearching = true;
					return from(this.searchItems()); // vì searchItems trả Promise
				})
			)
			.subscribe({
				next: () => {
					this.isSearching = false;
				},
				error: () => {
					this.isSearching = false;
				},
			});

		this.searchItemDataSource = this.formManagementService.createSelectDataSource((term) => {
			return this.intervalOrderProvider.commonService.connect('GET', 'PURCHASE/OrderInterval/ComponentSearch', {
				IDBranch: this.formGroup.get('IDBranch').value,
				IntervalName: this.formGroup.get('IntervalName').value,
				Keyword: term,
			});
		});
		this.searchItemDataSource.initSearch();
		this.intervalOrderProvider
			.read({ Take: 20 })
			.then((rs: any) => {
				this.intervalDataSource.selected = [...rs.data];
				this.intervalDataSource.initSearch();
			})
			.catch((err) => {
				this.intervalDataSource.initSearch();
				console.error(err);
			});
	}

	triggerSearch() {
		this.searchTrigger$.next();
	}

	onSelectedRowsChange(rows) {
		this.selectedItems = rows || [];
		this.applySelectionValidators();
		this.showCommandBySelectedRows(this.selectedItems);
	}

	applySelectionValidators() {
		const selectedSet = new Set(this.selectedItems || []);
		this.items.forEach((item) => {
			const form = item?._formGroup;
			if (!form) return;
			const isSelected = selectedSet.has(item);
			const uomCtrl = form.get('IDItemUoM');
			const qtyCtrl = form.get('Quantity');
			if (isSelected) {
				uomCtrl.setValidators(Validators.required);
				qtyCtrl.setValidators(Validators.required);
			} else {
				uomCtrl.clearValidators();
				qtyCtrl.clearValidators();
			}
			uomCtrl.updateValueAndValidity({ emitEvent: false });
			qtyCtrl.updateValueAndValidity({ emitEvent: false });
		});
	}

	validateSelectedItems(): boolean {
		const invalidItems = (this.selectedItems || []).filter((item) => item?._formGroup && item._formGroup.invalid);
		if (invalidItems.length) {
			invalidItems.forEach((item) => {
				item._formGroup.get('IDItemUoM')?.markAsTouched();
				item._formGroup.get('Quantity')?.markAsTouched();
			});
			this.env.showMessage('Please fill Quantity and Unit for selected items', 'warning');
			return false;
		}
		return true;
	}

	onDatatableFilter(e) {
		const keyword = e?.query?.Name ?? '';
		this.formGroup.get('Keyword').setValue(keyword);
		this.searchTrigger$.next();
	}
	searchItems() {
		return this.intervalOrderProvider.commonService
			.connect('GET', 'PURCHASE/OrderInterval/ComponentSearch', {
				IDBranch: this.formGroup.get('IDBranch').value,
				IntervalName: this.formGroup.get('IntervalName').value || undefined,
				Keyword: this.formGroup.get('Keyword').value,
			})
			.toPromise()
			.then((rs: any) => {
				const rows = Array.isArray(rs?.data) ? rs.data : Array.isArray(rs) ? rs : [];
				this.items = rows;
				this.items.forEach((item) => this.buildForm(item));
			});
	}

	buildForm(item: any) {
		const uoMs = Array.isArray(item?.UoMs) ? item.UoMs : [];
		const vendors = Array.isArray(item?._Vendors) ? item._Vendors : [];
		const defaultUoMId = item.IDItemUoM ?? item.PurchasingUoM ?? uoMs.find((d) => d.IsBaseUoM)?.Id ?? uoMs[0]?.Id ?? null;
		const quantity = item.Quantity ?? null;

		item._formGroup = this.formBuilder.group({
			_IDUoMDataSource: [uoMs],
			_Vendors: [vendors],
			IDItemUoM: [defaultUoMId],
			IDVendor: [''],
			Quantity: [quantity],
		});

		if (defaultUoMId != null && item.IDItemUoM == null) {
			item.IDItemUoM = defaultUoMId;
		}

		
		
		if (quantity != null && item.Quantity == null) {
			item.Quantity = quantity;
		}
	}

	setValueItemSelected(item: any) {
		const form = item?._formGroup;
		if (!form) return;
		item.IDItemUoM = form.get('IDItemUoM')?.value ?? null;
		item.IDVendor = form.get('IDVendor')?.value ?? null;
		item.Quantity = form.get('Quantity')?.value ?? null;
	}
	checkAll(){
		if(this.isCheckAll){
			this.selectedItems = [...this.items];
		}else{
			this.selectedItems = [];
		}
		this.applySelectionValidators();
		this.showCommandBySelectedRows(this.selectedItems);
	}
	async dismissModal(isApply = false) {
		if(isApply){
			this.applySelectionValidators();
			if (!this.validateSelectedItems()) return;
			if (!this.IDPurchaseRequest) {
				this.env.showMessage('Please save Purchase Request before adding items', 'warning');
				return;
			}

			const lines = (this.selectedItems || []).map((item) => {
				this.setValueItemSelected(item);
				const baseUoM = item?.UoMs?.find((u) => u.IsBaseUoM);
				const taxRate = item?.TaxRate ?? item?.PurchaseTaxInPercent ?? null;
				const taxId = item?.IDTax ?? item?.IDPurchaseTaxDefinition ?? null;
				const vendorId = item.IDVendor === '' ? null : item.IDVendor ?? null;
				return {
					IDItem: item.Id,
					IDItemUoM: item.IDItemUoM,
					IDBaseUoM: baseUoM?.Id ?? null,
					IDVendor: vendorId,
					Id: null,
					Status: 'Open',
					UoMPrice: item?.UoMPrice ?? null,
					Quantity: item.Quantity,
					QuantityRemainingOpen: item.Quantity,
					IDTax: taxId,
					TaxRate: taxRate,
					RequiredDate : this.RequiredDate
				};
			});

			const orderLines = lines.reduce((acc: Record<number, any>, line, index) => {
				acc[index] = line;
				return acc;
			}, {} as Record<number, any>);
			const payload = {
				IDBranch: this.formGroup.get('IDBranch').value,
				Id: this.IDPurchaseRequest,
				OrderLines: orderLines,
			};

			this.env.showLoading('Please wait for a few moments', this.purchaseRequestProvider.save(payload)).then(() => {
				this.modalController.dismiss({ reload: true });
			});
		}	
		else this.modalController.dismiss(null);
	}
}
