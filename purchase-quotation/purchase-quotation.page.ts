import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {  PURCHASE_QuotationProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-purchase-quotation',
    templateUrl: 'purchase-quotation.page.html',
    styleUrls: ['purchase-quotation.page.scss'],
    standalone: false
})
export class PurchaseQuotationPage extends PageBase {
  constructor(
    public pageProvider: PURCHASE_QuotationProvider,
    public sysConfigProvider: SYS_ConfigProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
  }

  preLoadData(event) {
   super.preLoadData(event);
  }

  loadedData(event) {
  
    super.loadedData(event);
    
  }


}
