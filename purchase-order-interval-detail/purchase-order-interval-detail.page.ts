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
		{ Name: 'One Time', Code: 'OneTime' },
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
	monthDataSource = [
		{ Name: 'January', Code: 1 },
		{ Name: 'February', Code: 2 },
		{ Name: 'March', Code: 3 },
		{ Name: 'April', Code: 4 },
		{ Name: 'May', Code: 5 },
		{ Name: 'June', Code: 6 },
		{ Name: 'July', Code: 7 },
		{ Name: 'August', Code: 8 },
		{ Name: 'September', Code: 9 },
		{ Name: 'October', Code: 10 },
		{ Name: 'November', Code: 11 },
		{ Name: 'December', Code: 12 },
	];
	monthlyMethodDataSource = [
		{ Name: 'Days', Code: 0 },
		{ Name: 'On', Code: 1 },
	];
	monthlyDayDataSource = [
		...Array.from({ length: 31 }, (_, i) => ({ Name: `${i + 1}`, Code: i + 1 })),
		{ Name: 'Last', Code: 'LAST' },
	];
	monthlyWeekDataSource = [
		{ Name: 'First', Code: 1 },
		{ Name: 'Second', Code: 2 },
		{ Name: 'Third', Code: 3 },
		{ Name: 'Fourth', Code: 4 },
		{ Name: 'Last', Code: 'LAST' },
	];

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
			StartDate: ['', Validators.required],
			EndDate: [''],
			Value: [''],
			WeeklyDays: [''],
			MonthlyMonths: [''],
			MonthlyMethod: [''],
			MonthlyDays: [''],
			MonthlyWeeks: [''],
			MonthlyWeekDays: [''],
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


	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		super.loadedData(event, ignoredFromGroup);
		this.setMonthlyMethodControl();
		this.setMultiValueControl('WeeklyDays');
		this.setMultiValueControl('MonthlyMonths');
		this.setMultiValueControl('MonthlyDays');
		this.setMultiValueControl('MonthlyWeeks');
		this.setMultiValueControl('MonthlyWeekDays');
		this.onTypeChange(false);
	}

	async saveChange() {
		super.saveChange2();
	}

	onTypeChange(resetValue = false) {
		const type = this.formGroup?.get('Type')?.value;
		const isOneTime = type === 'OneTime';
		const isDaily = type === 'Daily';
		const isWeekly = type === 'Weekly';
		const isMonthly = type === 'Monthly';
		const valueControl = this.formGroup?.get('Value');
		const weeklyDaysControl = this.formGroup?.get('WeeklyDays');
		const monthlyMethodControl = this.formGroup?.get('MonthlyMethod');
		const monthlyMonthsControl = this.formGroup?.get('MonthlyMonths');

		if (valueControl) {
			valueControl.clearValidators();
			if (isDaily || isWeekly) valueControl.setValidators([Validators.required, Validators.min(1)]);
			if (resetValue && !isDaily && !isWeekly) this.resetControl(valueControl);
			if ((isOneTime || isMonthly) && resetValue) {
				valueControl.setValue(1);
				valueControl.markAsDirty();
			}
			valueControl.updateValueAndValidity({ emitEvent: false });
		}

		if (weeklyDaysControl) {
			weeklyDaysControl.clearValidators();
			if (isWeekly) weeklyDaysControl.setValidators([Validators.required]);
			if (resetValue && !isWeekly) this.clearMultiField('WeeklyDays');
			weeklyDaysControl.updateValueAndValidity({ emitEvent: false });
		}

		if (monthlyMethodControl) {
			monthlyMethodControl.clearValidators();
			if (isMonthly) monthlyMethodControl.setValidators([Validators.required]);
			if (resetValue && !isMonthly) this.resetControl(monthlyMethodControl);
			monthlyMethodControl.updateValueAndValidity({ emitEvent: false });
		}

		if (monthlyMonthsControl) {
			monthlyMonthsControl.clearValidators();
			if (isMonthly) monthlyMonthsControl.setValidators([Validators.required]);
			if (resetValue && !isMonthly) this.clearMultiField('MonthlyMonths');
			monthlyMonthsControl.updateValueAndValidity({ emitEvent: false });
		}

		if (!isMonthly) {
			const monthlyDaysControl = this.formGroup?.get('MonthlyDays');
			const monthlyWeeksControl = this.formGroup?.get('MonthlyWeeks');
			const monthlyWeekDaysControl = this.formGroup?.get('MonthlyWeekDays');
			monthlyDaysControl?.clearValidators();
			monthlyWeeksControl?.clearValidators();
			monthlyWeekDaysControl?.clearValidators();
			monthlyDaysControl?.updateValueAndValidity({ emitEvent: false });
			monthlyWeeksControl?.updateValueAndValidity({ emitEvent: false });
			monthlyWeekDaysControl?.updateValueAndValidity({ emitEvent: false });
		}

		if (!isMonthly && resetValue) {
			this.clearMultiField('MonthlyDays');
			this.clearMultiField('MonthlyWeeks');
			this.clearMultiField('MonthlyWeekDays');
			this.clearMultiField('MonthlyMonths');
		}

		this.onMonthlyMethodChange(resetValue);
	}

	onMonthlyMethodChange(resetValue = false) {
		const type = this.formGroup?.get('Type')?.value;
		if (type !== 'Monthly') return;

		const methodControl = this.formGroup?.get('MonthlyMethod');
		const method = this.normalizeMonthlyMethod(methodControl?.value);
		const monthlyDaysControl = this.formGroup?.get('MonthlyDays');
		const monthlyWeeksControl = this.formGroup?.get('MonthlyWeeks');
		const monthlyWeekDaysControl = this.formGroup?.get('MonthlyWeekDays');

		if (methodControl && method !== methodControl.value) {
			methodControl.setValue(method, { emitEvent: false });
		}
		if (resetValue) methodControl?.markAsDirty();
		else methodControl?.markAsPristine();

		if (monthlyDaysControl) monthlyDaysControl.clearValidators();
		if (monthlyWeeksControl) monthlyWeeksControl.clearValidators();
		if (monthlyWeekDaysControl) monthlyWeekDaysControl.clearValidators();

		if (method === 0) {
			if (monthlyDaysControl) monthlyDaysControl.setValidators([Validators.required]);
			if (resetValue) {
				this.clearMultiField('MonthlyWeeks');
				this.clearMultiField('MonthlyWeekDays');
			}
		} else if (method === 1) {
			if (monthlyWeeksControl) monthlyWeeksControl.setValidators([Validators.required]);
			if (monthlyWeekDaysControl) monthlyWeekDaysControl.setValidators([Validators.required]);
			if (resetValue) this.clearMultiField('MonthlyDays');
		}

		if (monthlyDaysControl) monthlyDaysControl.updateValueAndValidity({ emitEvent: false });
		if (monthlyWeeksControl) monthlyWeeksControl.updateValueAndValidity({ emitEvent: false });
		if (monthlyWeekDaysControl) monthlyWeekDaysControl.updateValueAndValidity({ emitEvent: false });
	}

	private parseMultiValue(value: any) {
		if (!value) return [];
		if (Array.isArray(value)) return value;
		return value
			.toString()
			.split(',')
			.map((v) => v.trim())
			.filter((v) => v !== '')
			.map((v) => {
				const num = Number(v);
				return Number.isNaN(num) ? v : num;
			});
	}

	private serializeMultiValue(value: any) {
		if (value === null || value === undefined) return null;
		if (!Array.isArray(value)) return value;
		const mapped = value.filter((v) => v !== null && v !== undefined && v !== '');
		return mapped.length ? mapped.join(',') : null;
	}

	private setMultiValueControl(field: string) {
		const control = this.formGroup.get(field);
		if (!control) return;
		control.setValue(this.parseMultiValue(control.value), { emitEvent: false });
		control.markAsPristine();
	}

	private normalizeMonthlyMethod(value: any) {
		if (value === null || value === undefined || value === '') return null;
		if (value === true || value === 'true') return 1;
		if (value === false || value === 'false') return 0;
		const num = Number(value);
		return Number.isNaN(num) ? value : num;
	}

	private setMonthlyMethodControl() {
		const methodControl = this.formGroup.get('MonthlyMethod');
		if (!methodControl) return;
		const normalized = this.normalizeMonthlyMethod(methodControl?.value);
		methodControl.setValue(normalized, { emitEvent: false });
		methodControl.markAsPristine();
	}

	private resetControl(control: any) {
		if (!control) return;
		control.setValue(null);
		control.markAsDirty();
	}

	private clearMultiField(field: string) {
		const control = this.formGroup.get(field);
		if (!control) return;
		control.setValue([], { emitEvent: false });
		control.markAsDirty();
	}

	getDirtyValues(fg: FormGroup<any>) {
		const dirtyValues = super.getDirtyValues(fg);
		if (!dirtyValues) return dirtyValues;
		const multiFields = ['WeeklyDays', 'MonthlyMonths', 'MonthlyDays', 'MonthlyWeeks', 'MonthlyWeekDays'];
		multiFields.forEach((field) => {
			if (dirtyValues.hasOwnProperty(field)) {
				dirtyValues[field] = this.serializeMultiValue(dirtyValues[field]);
			}
		});
		if (dirtyValues.hasOwnProperty('MonthlyMethod')) {
			const method = this.normalizeMonthlyMethod(dirtyValues['MonthlyMethod']);
			dirtyValues['MonthlyMethod'] = method === 1 ? true : method === 0 ? false : dirtyValues['MonthlyMethod'];
		}
		return dirtyValues;
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
