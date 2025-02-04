import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BANK_OutgoingPaymentProvider,
  PURCHASE_OrderProvider,
  SYS_ConfigProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-purchase-order',
  templateUrl: 'purchase-order.page.html',
  styleUrls: ['purchase-order.page.scss'],
  standalone: false,
})
export class PurchaseOrderPage extends PageBase {
  statusList = [];
  paymentStatusList = [];
  paymentTypeList = [];
  paymentReasonList = [];
  showRequestOutgoingPayment = false;
  constructor(
    public pageProvider: PURCHASE_OrderProvider,
    public sysConfigProvider: SYS_ConfigProvider,
    public outgoingPaymentProvider: BANK_OutgoingPaymentProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public formBuilder: FormBuilder,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();

    this.formGroup = formBuilder.group({
      PaymentType: [''],
      PaymentSubType: [''],
      PaymentReason: [''],
    });
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
      this.env.getStatus('OutgoingPaymentStatus'),
      this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch }),
      this.env.getType('PaymentType'),
      this.env.getType('OutgoingPaymentReasonType'),
    ]).then((values) => {
      this.statusList = values[0];
      this.paymentStatusList = values[1];
      values[2]['data'].forEach((e) => {
        if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
          e.Value = e._InheritedConfig.Value;
        }
        this.pageConfig[e.Code] = JSON.parse(e.Value);
      });
      if (values[3]) {
        this.paymentTypeList = values[3].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
      }
      if (values[4]) {
        this.paymentReasonList = values[4];
        if (values[4].length == 0)
          this.paymentReasonList = [
            { Name: 'Payment of invoice', Code: 'PaymentOfInvoice' },
            { Name: 'Payment of purchase order', Code: 'PaymentOfPO' },
          ];
      }
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
    if (this.pageConfig.canSubmitOrdersForApproval) {
      this.pageConfig.canSubmit = true;
    }
    if (this.pageConfig['POUsedApprovalModule']) {
      this.pageConfig['canApprove'] = false;
    }

    super.loadedData(event);
  }

  merge() {}
  split() {}

  submit() {
    // submit PO
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
          {
            code: 'Bạn có chắc muốn gửi duyệt {{value}} đơn hàng đang chọn?',
            value: { value: this.selectedItems.length },
          },
          null,
          { code: 'Gửi duyệt {{value}} mua hàng', value: { value: this.selectedItems.length } },
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
                this.env.showMessage('Please check again, orders must have at least 1 item to be approved', 'warning');
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
          { code: 'Bạn có chắc muốn DUYỆT {{value}} đơn hàng đang chọn?', value: this.selectedItems.length },
          null,
          { code: 'Duyệt {{value}} đơn hàng', value: this.selectedItems.length },
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
                this.env.showMessage('Please check again, orders must have at least 1 item to be approved', 'warning');
              }
            })
            .catch((err) => {
              this.submitAttempt = false;
              console.log(err);
            });
        });
    }
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
          { code: 'Bạn có chắc muốn TRẢ LẠI {{value}} đơn hàng đang chọn?', value: this.selectedItems.length },
          null,
          { code: 'Duyệt {{value}} đơn hàng', value: this.selectedItems.length },
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
          { code: 'Bạn có chắc muốn HỦY {{value}} đơn hàng đang chọn?', value: this.selectedItems.length },
          null,
          { code: 'Duyệt {{value}} đơn hàng', value: this.selectedItems.length },
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

  ngOnDestroy() {
    this.dismissPopover();
  }
  IDBusinessPartner = null;
  @ViewChild('popoverPub') popoverPub;
  isOpenPopover = false;
  dismissPopover(apply: boolean = false) {
    if (!this.isOpenPopover || !this.IDBusinessPartner) return;
    if (apply) {
      this.submitAttempt = true;
      let obj = {
        Id: 0,
        IDBranch: this.env.selectedBranch,
        IDBusinessPartner: this.IDBusinessPartner,
        Name: 'Pay for PO [' + this.selectedItems.map((d) => d.Id).join(',') + ']',
        SourceType: 'Order',
        IDStaff: this.env.user.StaffID,
        PostingDate: new Date(),
        DueDate: new Date(),
        DocumentDate: new Date(),
        SubType: this.formGroup.get('PaymentSubType').value,
        Type: this.formGroup.get('PaymentType').value,
        PaymentReason: this.formGroup.get('PaymentReason').value,
        OutgoingPaymentDetails: this.selectedItems.map((d) => d.Id),
      };
      this.outgoingPaymentProvider.commonService
        .connect('POST', 'BANK/OutgoingPayment/PostFromSource', obj)
        .toPromise()
        .then((rs: any) => {
          this.env
            .showPrompt('Create outgoing payment successfully!', 'Do you want to navigate to outgoing payment ?')
            .then((d) => {
              this.nav('outgoing-payment/' + rs.Id, 'forward');
            });
          console.log(rs);
        })
        .catch((err) => {
          this.env.showMessage(err?.error?.Message ?? err, 'danger');
        })
        .finally(() => {
          this.submitAttempt = false;
        });

      // this.form.patchValue(this._reportConfig?.DataConfig);
    }
    this.isOpenPopover = false;
  }
  presentPopover(event) {
    this.isOpenPopover = true;
  }

  ShowRequestOutgoingPayment;
  ShowSubmitForApproval;
  changeSelection(i, e = null) {
    super.changeSelection(i, e);

    {
      // this.ShowRequestOutgoingPayment = false;
      // this.pageConfig.ShowSubmitOrders = this.pageConfig.canSubmitOrders;
      // this.pageConfig.ShowApprove =
      //   this.pageConfig.ShowDisapprove =
      //   this.pageConfig.canDisapprove =
      //     this.pageConfig.canApprove;
      // this.pageConfig.ShowSubmit = this.pageConfig.canSubmit;
      // this.pageConfig.ShowCancel = this.pageConfig.canCancel;
      // this.pageConfig.ShowDelete = this.pageConfig.canDelete;
      // this.pageConfig.ShowDelete = this.pageConfig.canDelete;
      // this.pageConfig.ShowCopyToReceipt = this.pageConfig.canCopyToReceipt;
      // this.pageConfig.ShowRequestOutgoingPayment = this.pageConfig.canRequestOutgoingPayment;
    }

    const approveSet = new Set(['Submitted', 'Draft']);
    const submitSet = new Set(['Draft', 'Unapproved']);
    const cancelSet = new Set(['Draft', 'Unapproved']);
    const deleteSet = new Set(['Draft', 'Unapproved', 'Cancelled']);
    const copyToReceiptSet = new Set([ 'Approved' ,'Confirmed','Ordered']);
    const requestOutgoingPaymentSet = new Set(['Ordered']);
    const uniqueSellerIDs = new Set(this.selectedItems.map((i) => i.IDVendor));
    const toolbarSet = new Set(['Draft', 'Unapproved', 'Submitted']);
    this.pageConfig.ShowApprove = this.selectedItems.every(i => approveSet.has(i.Status));

    this.pageConfig.ShowSubmit = this.selectedItems.every(i => submitSet.has(i.Status));
    this.pageConfig.ShowCancel = this.selectedItems.every(i => cancelSet.has(i.Status));
    this.pageConfig.ShowDelete = this.selectedItems.every(i => deleteSet.has(i.Status));
    this.pageConfig.ShowCopyToReceipt =  this.selectedItems.every(i => copyToReceiptSet.has(i.Status));
    this.pageConfig.ShowRequestOutgoingPayment =this.selectedItems.every(i => requestOutgoingPaymentSet.has(i.Status));
    this.pageConfig.ShowChangeBranch = this.pageConfig.ShowApprove = this.pageConfig.ShowDisapprove =
    this.pageConfig.ShowArchive = this.pageConfig.ShowDelete = this.selectedItems.every(i => toolbarSet.has(i.Status));
    if (this.pageConfig.canRequestOutgoingPayment) {
      this.pageConfig.ShowRequestOutgoingPayment = true;
    }
    if (uniqueSellerIDs.size > 1) {
      this.ShowRequestOutgoingPayment = false;
      this.IDBusinessPartner = null;
    } else {
      this.IDBusinessPartner = [...uniqueSellerIDs][0];
    }

  }
  copyToReceipt() {
    if (!this.pageConfig.canCopyToReceipt) return;
    let obj = this.selectedItems.map((d) => {
      return { Id: d.Id };
    });

    this.pageProvider.commonService
      .connect('POST', 'PURCHASE/Order/CopyToReceipt/', obj)
      .toPromise()
      .then((rs: any) => {
        if (rs > 0) {
          this.env.showMessage('ASN created!', 'success');
          this.refresh();
        }
      })
      .catch((err) => {
        this.env.showMessage('Cannot create ASN, please try again later', 'danger');
      });
  }
}
