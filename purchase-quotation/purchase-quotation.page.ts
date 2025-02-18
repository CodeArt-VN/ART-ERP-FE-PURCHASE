import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {  PURCHASE_QuotationProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
@Component({
    selector: 'app-purchase-quotation',
    templateUrl: 'purchase-quotation.page.html',
    styleUrls: ['purchase-quotation.page.scss'],
    standalone: false
})
export class PurchaseQuotationPage extends PageBase {
  statusList: any =[];
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
   this.query.Type = 'PurchaseRequest';
   if (!this.sort.Id) {
     this.sort.Id = 'Id';
     this.sortToggle('Id', true);
   }
   let sysConfigQuery = ['PRUsedApprovalModule'];
   Promise.all([
     this.env.getStatus('PurchaseRequest'),
     this.sysConfigProvider.read({ Code_in: sysConfigQuery }),
   ]).then((values) => {
     this.statusList = values[0];
     values[1]['data'].forEach((e) => {
       if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
         e.Value = e._InheritedConfig.Value;
       }
       this.pageConfig[e.Code] = JSON.parse(e.Value);
     });
     super.preLoadData(event);
   });
  }

  loadedData(event) {
  this.items.forEach((i) => {
        i.RequestBranchName = this.env.branchList.find(d=> d.Id == i.IDRequestBranch)?.Name;
        i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '--', 'Code');
        i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', 'dark', 'Code');
      });
    super.loadedData(event);
    console.log(this.items);
  }


}
