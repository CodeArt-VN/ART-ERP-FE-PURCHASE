import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PURCHASE_OrderProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';

@Component({
  selector: 'app-purchase-order',
  templateUrl: 'purchase-order.page.html',
  styleUrls: ['purchase-order.page.scss'],
})
export class PurchaseOrderPage extends PageBase {
  statusList = [];
  paymentStatusList = [];

  constructor(
    public pageProvider: PURCHASE_OrderProvider,
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
    this.query.Type_ne = 'PurchaseRequest';
    if (!this.sort.Id) {
      this.sort.Id = 'Id';
      this.sortToggle('Id', true);
    }
    let sysConfigQuery = ['POUsedApprovalModule'];
    Promise.all([
      this.env.getStatus('PurchaseOrder'),
      this.env.getStatus('POPaymentStatus'),
      this.sysConfigProvider.read({ Code_in: sysConfigQuery }),
    ]).then((values) => {
      this.statusList = values[0];
      this.paymentStatusList = values[1];
      values[2]['data'].forEach((e) => {
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
      i.TotalAfterTaxText = lib.currencyFormat(i.TotalAfterTax);
      i.ExpectedReceiptDateText = lib.dateFormat(i.ExpectedReceiptDate, 'dd/mm/yyyy');
      i.ExpectedReceiptTimeText = lib.dateFormat(i.ExpectedReceiptDate, 'hh:MM');
      i.OrderDateText = lib.dateFormat(i.OrderDate, 'dd/mm/yyyy');
      i.OrderTimeText = lib.dateFormat(i.OrderDate, 'hh:MM');
      i.StatusText = lib.getAttrib(i.Status, this.statusList, 'Name', '--', 'Code');
      i.StatusColor = lib.getAttrib(i.Status, this.statusList, 'Color', 'dark', 'Code');
    });
    if (this.pageConfig['POUsedApprovalModule']) {
      this.pageConfig['canApprove'] = false;
    }
    super.loadedData(event);
  }

  mergeSaleOrders() {}
  splitSaleOrder() {}

  submitOrdersForApproval() {
    if (!this.pageConfig.canSubmitOrdersForApproval) return;
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
          {code:'Bạn có chắc muốn gửi duyệt {{value}} đơn hàng đang chọn?',value:{value:this.selectedItems.length}},
          null,
          {code:'Gửi duyệt {{value}} mua hàng',value:{value:this.selectedItems.length}}
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Order/SubmitOrdersForApproval/'), postDTO)
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
  approveOrders() {
    if (!this.pageConfig.canApprove) return;
    if (this.submitAttempt) return;

    let itemsCanNotProcess = this.selectedItems.filter((i) => !(i.Status == 'Submitted'));
    if (itemsCanNotProcess.length == this.selectedItems.length) {
      this.env.showMessage(
        'Your selected order cannot be approved. Please only select pending for approval order',
        'warning',
      );
    } else {
      itemsCanNotProcess.forEach((i) => {
        i.checked = false;
      });
      this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Submitted');
      this.env
        .showPrompt(
          {code:'Bạn có chắc muốn DUYỆT {{value}} đơn hàng đang chọn?',value:{value:this.selectedItems.length}},
          null,
          {code:'Duyệt {{value}} đơn hàng',value:{value:this.selectedItems.length}},
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Order/ApproveOrders/'), postDTO)
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
    }
  }
  disapproveOrders() {
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
          {code:'Bạn có chắc muốn TRẢ LẠI {{value}} đơn hàng đang chọn?',value:{value:this.selectedItems.length}},
          null,
          {code:'Duyệt {{value}} đơn hàng',value:{value:this.selectedItems.length}},
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Order/DisapproveOrders/'), postDTO)
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
  cancelOrders() {
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
          {code:'Bạn có chắc muốn HỦY {{value}} đơn hàng đang chọn?',value:{value:this.selectedItems.length}},
          null,
          {code:'Duyệt {{value}} đơn hàng',value:{value:this.selectedItems.length}},
        )
        .then((_) => {
          this.submitAttempt = true;
          let postDTO = { Ids: [] };
          postDTO.Ids = this.selectedItems.map((e) => e.Id);

          this.pageProvider.commonService
            .connect('POST', ApiSetting.apiDomain('PURCHASE/Order/CancelOrders/'), postDTO)
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
  submitOrders() {
    if (this.submitAttempt) {
      return;
    }

    this.selectedItems = this.selectedItems.filter((i) => i.Status == 'Approved');
    this.submitAttempt = true;
    let postDTO = { Ids: [] };
    postDTO.Ids = this.selectedItems.map((e) => e.Id);

    this.pageProvider.commonService
      .connect('POST', ApiSetting.apiDomain('PURCHASE/Order/SubmitOrders/'), postDTO)
      .toPromise()
      .then((savedItem: any) => {
        this.env.publishEvent({ Code: this.pageConfig.pageName });
        this.env.showMessage('Purchased ordered', 'success');
        this.submitAttempt = false;
      })
      .catch((err) => {
        this.submitAttempt = false;
        console.log(err);
      });
  }
}
