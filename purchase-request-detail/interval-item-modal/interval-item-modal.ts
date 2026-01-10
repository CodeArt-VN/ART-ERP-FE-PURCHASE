import { Component, Input, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { debounceTime, switchMap, from, Subject } from 'rxjs';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { FormManagementService } from 'src/app/services/page/form-management.service';
import { PURCHASE_OrderIntervalProvider, PURCHASE_RequestProvider } from 'src/app/services/static/services.service';
import { environment } from 'src/environments/environment';

@Component({
	selector: 'app-interval-item',
	templateUrl: './interval-item-modal.html',
	styleUrls: ['./interval-item-modal.scss'],
	standalone: false,
})
export class IntervalItemModalComponent extends PageBase {
	@ViewChild('importfile') importfile: any;
	private searchTrigger$ = new Subject<void>();
	@Input() IDPurchaseRequest: number;
	@Input() RequiredDate: any;
	intervalList = [];
	intervalDataSource: any;
	searchItemDataSource: any;
	formManagementService = new FormManagementService();
	isSearching = false;
	_IDVendor = null;
	isCheckAll = false;
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
			IDVendor: [],
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
	checkAll() {
		if (this.isCheckAll) {
			this.selectedItems = [...this.items];
		} else {
			this.selectedItems = [];
		}
		this.applySelectionValidators();
		this.showCommandBySelectedRows(this.selectedItems);
	}
	applyItems() {
		this.applySelectionValidators();
		if (!this.validateSelectedItems()) return;
		if (!this.IDPurchaseRequest) {
			this.env.showMessage('Please save Purchase Request before adding items', 'warning');
			return;
		}
		this.dismissModal(true);
	}
	async dismissModal(isApply = false) {
		this.modalController.dismiss(isApply);
	}
	async onExportToExcel() {
		this.intervalOrderProvider.commonService
			.connect('GET', 'PURCHASE/OrderInterval/ExportComponentItem', this.buildExportPayload())
			.toPromise()
			.then((url: any) => {
				if (url.indexOf('http') == -1) {
					url = environment.appDomain + url;
				}
				var pom = document.createElement('a');
				pom.setAttribute('target', '_blank');
				pom.setAttribute('href', url);
				//pom.setAttribute('target', '_blank');
				pom.style.display = 'none';
				document.body.appendChild(pom);
				pom.click();
				document.body.removeChild(pom);
			});
	}
	onClickImport() {
		this.importfile.nativeElement.value = '';
		this.importfile.nativeElement.click();
	}
	async onImport(event) {
		if (this.submitAttempt) {
			this.env.showMessage('erp.app.pages.sale.sale-order.message.importing', 'primary');
			return;
		}
		this.submitAttempt = true;
		const formData: FormData = new FormData();
		formData.append('fileKey', event.target.files[0], event.target.files[0].name);
		this.env
			.showLoading(
				'Please wait for a few moments',
				this.purchaseRequestProvider.commonService.connect('UPLOAD', 'PURCHASE/Request/ImportDetailFile/' + this.IDPurchaseRequest, formData).toPromise()
			)
			.then((resp: any) => {
				this.submitAttempt = false;
				if (resp.ErrorList && resp.ErrorList.length) {
					let message = '';
					for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
						if (i == 5) message += '<br> Còn nữa...';
						else {
							const e = resp.ErrorList[i];
							message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
						}
					this.env
						.showPrompt(
							{
								code: 'Có {{value}} lỗi khi import: {{value1}}',
								value: { value: resp.ErrorList.length, value1: message },
							},
							'Bạn có muốn xem lại các mục bị lỗi?',
							'Có lỗi import dữ liệu'
						)
						.then((_) => {
							this.dismissModal(true);
							this.downloadURLContent(resp.FileUrl);
						})
						.catch((e) => {});
				} else {
					this.env.showMessage('Import completed!', 'success');
					this.dismissModal(true);
				}
				// this.download(data);
			})
			.catch((err) => {
				this.submitAttempt = false;
				this.env.showMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
			});
	}

	buildExportPayload() {
		const compactData = {
			Items: this.selectedItems.map((i) => {
				{
					let item = i._formGroup.getRawValue();
					let uomName = i.UoMs.find((u) => u.Id == item.IDItemUoM)?.Name || '';
					return {
						IDItem: i.Id,
						ItemName: i.Name,
						UoMName: uomName,
						IDUoM: item.IDItemUoM,
						Quantity: item.Quantity,
						IDVendor: item.IDVendor ?? null,
					};
				}
			}),
		};
		return {
			IDBranch: this.formGroup.get('IDBranch').value.toString(),
			Data: JSON.stringify(compactData),
		};
	}
}
