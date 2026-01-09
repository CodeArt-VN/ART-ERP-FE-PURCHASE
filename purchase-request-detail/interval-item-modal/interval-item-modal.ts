import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { debounceTime, distinctUntilChanged, switchMap, tap, from, Subject } from 'rxjs';
import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { FormManagementService } from 'src/app/services/page/form-management.service';
import { PURCHASE_OrderIntervalProvider } from 'src/app/services/static/services.service';

@Component({
	selector: 'app-interval-item',
	templateUrl: './interval-item-modal.html',
	styleUrls: ['./interval-item-modal.scss'],
	standalone: false,
})
export class IntervalItemModalComponent extends PageBase {
private searchTrigger$ = new Subject<void>();
	intervalList = [];
	intervalDataSource: any;
	searchItemDataSource: any;
	formManagementService = new FormManagementService();
	searchControl: any;
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
		this.searchControl = this.formGroup.get('Keyword');

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
	searchItems() {
		return this.intervalOrderProvider.commonService
			.connect('GET', 'PURCHASE/OrderInterval/ComponentSearch', {
				IDBranch: this.formGroup.get('IDBranch').value,
				IntervalName: this.formGroup.get('IntervalName').value || undefined,
				Keyword: this.formGroup.get('Keyword').value,
			})
			.toPromise()
			.then((rs: any) => {
				this.items = rs;
			});
	}
	checkAll(){
		if(this.isCheckAll){
			this.selectedItems = [...this.items];
		}else{
			this.selectedItems = [];
		}
	}
	dismissModal(isApply = false) {
		if(isApply){
		 this.modalController.dismiss(this.selectedItems);

		}	
		else this.modalController.dismiss(null);
	}
}
