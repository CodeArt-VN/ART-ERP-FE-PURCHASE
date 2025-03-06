import { Component, Input } from '@angular/core';
import { NavController, NavParams, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { HRM_StaffProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { FormBuilder } from '@angular/forms';

@Component({
	selector: 'app-search-async-popover',
	templateUrl: './search-async-popover.page.html',
	styleUrls: ['./search-async-popover.page.scss'],
	standalone: false,
})
export class SearchAsyncPopoverPage {
	provider: any;
	type: string;
	query: any;
	title: string;
	initDatasource = [];
	searchFunction: any;
	_dataSource: any;
	formGroup: any;
	item;
	items = [];
	constructor(
		public env: EnvService,
		public navCtrl: NavController,
		public navParams: NavParams,
		public popoverCtrl: PopoverController,
		public translate: TranslateService,
		public formBuilder: FormBuilder
	) {
		this.formGroup = this.formBuilder.group({
			Id: [''],
		});
	}
	ngOnInit() {
		this._dataSource = this.searchFunction;
		this._dataSource.initSearch();
	}
	submit() {
		this.popoverCtrl.dismiss(this.item);
	}
	onChange(ev) {
		this.item = ev;
	}
}
