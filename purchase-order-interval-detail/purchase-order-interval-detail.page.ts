import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, NavParams, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { PURCHASE_OrderIntervalProvider } from 'src/app/services/static/services.service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
	selector: 'app-purchase-order-interval-detail',
	templateUrl: './purchase-order-interval-detail.page.html',
	styleUrls: ['./purchase-order-interval-detail.page.scss'],
	standalone: false,
})
export class PurchaseOrderIntervalDetailPage extends PageBase {
	typeDataSource = [
		{ Name: 'Every each day', Code: 'EveryEachDay' },
		{ Name: 'Daily', Code: 'Daily' },
		{ Name: 'Weekly', Code: 'Weekly' },
		{ Name: 'Monthly', Code: 'Monthly' },
	];
	weekDayDataSource = [
		{ Name: 'Monday', Code: 1 },
		{ Name: 'Tuesday', Code: 2 },
		{ Name: 'Wednesday', Code: 3 },
		{ Name: 'Thursday', Code: 4 },
		{ Name: 'Friday', Code: 5 },
		{ Name: 'Saturday', Code: 6 },
		{ Name: 'Sunday', Code: 0 },
	];
	monthDayDataSource = []

	

	constructor(
		public pageProvider: PURCHASE_OrderIntervalProvider,
		public env: EnvService,
		public navCtrl: NavController,
		public route: ActivatedRoute,
		public alertCtrl: AlertController,
		public navParams: NavParams,
		public formBuilder: FormBuilder,
		public cdr: ChangeDetectorRef,
		public modalController: ModalController,
		public loadingController: LoadingController
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.formGroup = formBuilder.group({
			Id: new FormControl({ value: '', disabled: true }),
			Code: [''],
			Name: ['', Validators.required],
			Type: ['', Validators.required],
			Value: ['', Validators.required],
			Remark: [''],
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}
	loadData(event?: any, forceReload?: boolean): void {
		this.monthDayDataSource = [];
		for (let day = 1; day <= 31; day++) {
		this.monthDayDataSource.push({
			Name: day.toString(),
			Code: day
		});
		}
		super.loadData(event, forceReload);
	}

	async saveChange() {
		super.saveChange2();
	}

	onTypeChange(resetValue = false) {
		const type = this.formGroup?.get('Type')?.value;
		const valueControl = this.formGroup?.get('Value');
		if (!valueControl) return;
		valueControl.clearValidators();

		if (type === 'EveryEachDay' || type === 'Weekly' || type === 'Monthly') {
			valueControl.setValue(null);
			valueControl.setValidators([Validators.required]);
		} else if (type === 'Daily' && resetValue) {
			valueControl.setValue(1);
		}

		valueControl.updateValueAndValidity();
	}
	changeName() {
		if (this.submitAttempt) return;
		this.submitAttempt = true;
		this.pageProvider
			.read({ Name: this.formGroup.controls.Name.value }, this.pageConfig.forceLoadData)
			.then((result: any) => {
				this.submitAttempt = false;
				if (result.data.length > 0) {
					let validName = result.data.find((d) => d.Name === this.formGroup.controls.Name.value);
					if (validName) {
						if (this.item.Id) this.formGroup.controls.Name.setValue(this.item.Name);
						else this.formGroup.controls.Name.setValue('');
						this.env.showMessage('Name is duplicated', 'danger');
						return;
					}
				}
			})
			.catch((err) => {
				this.submitAttempt = false;
				if (err.message != null) {
					this.env.showMessage(err.message, 'danger');
				} else {
					this.env.showMessage('Cannot extract data', 'danger');
				}
			});
	}
	delete(publishEventCode = this.pageConfig.pageName) {
		if (this.pageConfig.ShowDelete) {
			this.env
				.actionConfirm('delete', this.selectedItems.length, this.item?.Name, this.pageConfig.pageTitle, () =>
					this.pageProvider.delete(this.pageConfig.isDetailPage ? this.item : this.selectedItems)
				)
				.then((_) => {
					this.env.showMessage('DELETE_RESULT_SUCCESS', 'success');
					this.env.publishEvent({ Code: publishEventCode });

					if (this.pageConfig.isDetailPage) {
						this.deleted();
						this.closeModal();
					}
				})
				.catch((err: any) => {
					if (err != 'User abort action') this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
					console.log(err);
				});
		}
	}

	savedChange(savedItem?: any, form?: FormGroup<any>): void {
		super.savedChange(savedItem, form);
		this.item = savedItem;
		this.loadedData();
	}
}
