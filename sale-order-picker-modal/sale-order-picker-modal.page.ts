import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { SALE_OrderProvider } from 'src/app/services/static/services.service';
import { FormBuilder } from '@angular/forms';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
    selector: 'app-sale-order-picker-modal',
    templateUrl: './sale-order-picker-modal.page.html',
    styleUrls: ['./sale-order-picker-modal.page.scss'],
    standalone: false
})
export class SaleOrderPickerModalPage extends PageBase {
  constructor(
    public pageProvider: SALE_OrderProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,

    public modalController: ModalController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.pageConfig.isDetailPage = false;
    this.id = this.route.snapshot.paramMap.get('id');
  }

  preLoadData(event) {
    this.sort.Id = 'Id';
    this.sortToggle('Id', true);
    super.preLoadData(event);
  }

  loadData(event) {
    this.query.Take = 2000;
    this.query.IDStatus = 104;
    super.loadData(event);
  }

  loadedData(event) {
    this.selectedItems = [];
    this.items.forEach((i) => {
      i.OrderTimeText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'hh:MM') : '';
      i.OrderDateText = i.OrderDate ? lib.dateFormat(i.OrderDate, 'dd/mm/yy') : '';
      i.Query = i.OrderDate ? lib.dateFormat(i.OrderDate, 'yyyy-mm-dd') : '';
    });
    super.loadedData(event);
  }

  SaveSelectedOrders() {
    this.modalController.dismiss(this.selectedItems);
  }

  isAllChecked = false;
  toggleSelectAll() {
    this.items.forEach((i) => (i.checked = this.isAllChecked));
    this.selectedItems = this.isAllChecked ? [...this.items] : [];
  }
}
