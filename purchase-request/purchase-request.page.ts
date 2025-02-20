import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {  PURCHASE_RequestProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-purchase-request',
    templateUrl: 'purchase-request.page.html',
    styleUrls: ['purchase-request.page.scss'],
    standalone: false
})
export class PurchaseRequestPage extends PageBase {
  statusList = [];
  paymentStatusList = [];
  showSubmit = false;
  showApprove = false;
  showCancel = false;
  showDisapprove = false;
  imgPath ='';
  constructor(
    public pageProvider: PURCHASE_RequestProvider,
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
    this.imgPath = environment.staffAvatarsServer;
    this.pageConfig.ShowCommandRules = [
      { Status: 'Draft',      ShowBtns: ['ShowChangeBranch', 'ShowMerge', 'ShowSplit', 'ShowSubmit',  'ShowApprove',                  'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Mới
      { Status: 'Unapproved', ShowBtns: ['ShowChangeBranch', 'ShowMerge', 'ShowSplit', 'ShowSubmit',  'ShowApprove',                    'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Không duyệt
      { Status: 'Submitted',  ShowBtns: ['ShowApprove', 'ShowDisapprove',  'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Chờ duyệt
      { Status: 'Approved',   ShowBtns: [                                                                            'ShowDisapprove',  'ShowCancel',               'ShowArchive','ShowSendRequestQuotation'] }, // Đã duyệt
      { Status: 'QuotationSent',  ShowBtns: [] }, // Đã giao hàng
      { Status: 'Closed',       ShowBtns: [] }, // Đã xong
      { Status: 'Cancelled',  ShowBtns: [] }  // Đã hủy
    ];

  }

  preLoadData(event) {
    this.query.Type = 'PurchaseRequest';
    if (!this.sort.Id) {
      this.sort.Id = 'Id';
      this.sortToggle('Id', true);
    }
    let sysConfigQuery = ['PRUsedApprovalModule'];
    Promise.all([
      this.env.getStatus('PurchaseRequest'),
        this.sysConfigProvider.read({ Code_in: sysConfigQuery,  IDBranch: this.env.selectedBranch}),
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
    if (this.pageConfig['PRUsedApprovalModule']) {
      this.pageConfig['canApprove'] = false;
    }
  }

  mergeSaleOrders() { }
  splitSaleOrder() { }


  submit() { // submit PO
    if (!this.pageConfig.canSubmit) return;
    if (this.submitAttempt) return;

    let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'Draft' || i.Status == 'Unapproved'));
    if (itemsCanNotProcess.length == this.selectedItems.length) {
      this.env.showMessage(
        'Your selected invoices cannot be approved. Please select new or draft or disapproved ones',
        'warning',
      );
    } else {
      itemsCanNotProcess.forEach((i) => {
        i.checked = false;
      });
      this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Draft' || i.Status == 'Unapproved');

      this.env
        .showPrompt(
          {code:'Bạn có chắc muốn gửi duyệt {{value}} đơn hàng đang chọn?',value:this.selectedItems.length},
          null,
          {code:'Gửi duyệt {{value}} mua hàng',value:this.selectedItems.length}
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Request/Submit/'), postDTO)
            .toPromise()
            .then((savedItem: any) => {
              this.env.publishEvent({
                Code: this.pageConfig.pageName,
              });
              this.submitAttempt = false;

              if (savedItem > 0) {
                this.env.showMessage('{{value}} orders sent for approval', 'success', savedItem);
              } else {
                this.env.showMessage(
                  'Please check again, orders must have at least 1 item to be approved',
                  'warning',
                );
              }
            })
            .catch((err) => {
              this.submitAttempt = false;
              console.log(err);
            });
        });
    }
  }
  approve() {
    if (!this.pageConfig.canApprove) return;
    if (this.submitAttempt) return;

    // let itemsCanNotProcess = this.selectedItems.filter((i) => (i.Status != 'Submitted') || !this.pageConfig.canApprove);
    // if (itemsCanNotProcess.length == this.selectedItems.length) {
    //   this.env.showMessage(
    //     'Your selected order cannot be approved. Please only select pending for approval order',
    //     'warning',
    //   );
    // } else {
    //   itemsCanNotProcess.forEach((i) => {
    //     i.checked = false;
    //   });
      this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Submitted' || (i.Status == 'Draft' && this.pageConfig.canApprove));
      this.env
        .showPrompt(
          {code:'Bạn có chắc muốn DUYỆT {{value}} đơn hàng đang chọn?',value:this.selectedItems.length},
          null,
          {code:'Duyệt {{value}} đơn hàng',value:this.selectedItems.length},
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Request/Approve/'), postDTO)
            .toPromise()
            .then((savedItem: any) => {
              this.env.publishEvent({
                Code: this.pageConfig.pageName,
              });
              this.submitAttempt = false;

              if (savedItem > 0) {
                this.env.showMessage('{{value}} orders approved', 'success', savedItem);
              } else {
                this.env.showMessage(
                  'Please check again, orders must have at least 1 item to be approved',
                  'warning',
                );
              }
            })
            .catch((err) => {
              this.submitAttempt = false;
              console.log(err);
            });
        });
    // }
  }
  disapprove() {
    if (!this.pageConfig.canApprove) return;
    if (this.submitAttempt) return;

    let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'Submitted' || i.Status == 'Approved'));
    if (itemsCanNotProcess.length == this.selectedItems.length) {
      this.env.showMessage(
        'Your selected invoices cannot be disaaproved. Please select approved or pending for approval invoice',
        'warning',
      );
    } else {
      itemsCanNotProcess.forEach((i) => {
        i.checked = false;
      });
      this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Submitted' || i.Status == 'Approved');
      this.env
        .showPrompt(
          {code:'Bạn có chắc muốn TRẢ LẠI {{value}} đơn hàng đang chọn?',value:this.selectedItems.length},
          null,
          {code:'Duyệt {{value}} đơn hàng',value:this.selectedItems.length},
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Request/Disapprove/'), postDTO)
            .toPromise()
            .then((savedItem: any) => {
              this.env.publishEvent({
                Code: this.pageConfig.pageName,
              });
              this.env.showMessage('Saving completed!', 'success');
              this.submitAttempt = false;
            })
            .catch((err) => {
              this.submitAttempt = false;
              console.log(err);
            });
        });
    }
  }
  cancel() {
    if (!this.pageConfig.canCancel) return;
    if (this.submitAttempt) return;

    let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'Draft' || i.Status == 'Unapproved'));
    if (itemsCanNotProcess.length == this.selectedItems.length) {
      this.env.showMessage(
        'Your selected invoices cannot be canceled. Please select draft or pending for approval invoice',
        'warning',
      );
    } else {
      itemsCanNotProcess.forEach((i) => {
        i.checked = false;
      });
      this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Draft' || i.Status == 'Unapproved');
      this.env
        .showPrompt(
          {code:'Bạn có chắc muốn HỦY {{value}} đơn hàng đang chọn?',value:this.selectedItems.length},
          null,
          {code:'Duyệt {{value}} đơn hàng',value:this.selectedItems.length},
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Request/Cancel/'), postDTO)
            .toPromise()
            .then((savedItem: any) => {
              this.env.publishEvent({
                Code: this.pageConfig.pageName,
              });
              this.env.showMessage('Saving completed!', 'success');
              this.submitAttempt = false;
            })
            .catch((err) => {
              this.submitAttempt = false;
              console.log(err);
            });
        });
    }
  }


  
}
