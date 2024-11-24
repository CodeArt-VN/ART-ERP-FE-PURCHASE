import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BANK_OutgoingPaymentProvider, PURCHASE_OrderProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { lib } from 'src/app/services/static/global-functions';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-purchase-order',
  templateUrl: 'purchase-order.page.html',
  styleUrls: ['purchase-order.page.scss'],
})
export class PurchaseOrderPage extends PageBase {
  statusList = [];
  paymentStatusList = [];
  paymentTypeList = [];
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
      PaymentType: [this.env.selectedBranch],
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
      this.env.getStatus('POPaymentStatus'),
      this.sysConfigProvider.read({ Code_in: sysConfigQuery }),
      this.env.getType('PaymentType')
    ]).then((values) => {
      this.statusList = values[0];
      this.paymentStatusList = values[1];
      values[2]['data'].forEach((e) => {
        if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
          e.Value = e._InheritedConfig.Value;
        }
        this.pageConfig[e.Code] = JSON.parse(e.Value);
      });
      if(values[3]){
        this.paymentTypeList = values[3].filter((d) => d.Code == 'Cash' || d.Code == 'Card' || d.Code == 'Transfer');
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
    if (this.pageConfig['POUsedApprovalModule']) {
      this.pageConfig['canApprove'] = false;
    }
    super.loadedData(event);
  }
 
  merge() {}
  split() {}

  submit() { // submit PO
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
        Id:0,
        IDBusinessPartner : this.IDBusinessPartner,
        Status:'Draft',
        Amount : 0,
        PostingDate: new Date(),
        DueDate: new Date(),
        DocumentDate: new Date(),
        Type:this.formGroup.get('PaymentType').value,
        OutgoingPaymentDetails : this.selectedItems.map(d=> {
          return {
            DocumentEntry : d.Id,
            DocumentType : "Order",
            Amount: d.TotalAfterTax - d.Paid,
          }
      }),
    } 
    obj.Amount = obj.OutgoingPaymentDetails.reduce((sum, detail) => sum + ((detail.Amount) || 0), 0);
    this.outgoingPaymentProvider.save(obj).then(rs=>{
      this.env.showMessage('Create outgoing payment successfully!','success');
      console.log(rs);
    }).catch(err=>{
      this.env.showMessage(err?.Message?? err,'danger');

    }).finally(()=> {this.submitAttempt = false});
     
      // this.form.patchValue(this._reportConfig?.DataConfig);
    }
    this.isOpenPopover = false;
  }
  presentPopover(event) {
    this.isOpenPopover = true;
  }

  ShowRequestOutgoingPayment;
  ShowSubmitForApproval ;
  changeSelection(i, e = null) {
    super.changeSelection(i, e);
    this.ShowSubmitForApproval = false;
    this.pageConfig.ShowApprove = false;
    this.pageConfig.ShowDisapprove = false;
    this.pageConfig.ShowCancel = false;
    this.pageConfig.ShowDelete = false;
    this.ShowRequestOutgoingPayment = false;
  
    if (this.pageConfig.canApprove) {
      this.pageConfig.ShowApprove = true;
      this.pageConfig.ShowDisapprove = true;
    }
   if (this.pageConfig.canSubmitOrdersForApproval ) {
      this.ShowSubmitForApproval = true;
    }
    if (this.pageConfig.canCancel ) {
      this.pageConfig.ShowCancel  = true;
    }
    if (this.pageConfig.canDelete ) {
      this.pageConfig.ShowDelete= true;
    }
    if (this.pageConfig.canRequestOutgoingPayment ) {
      this.ShowRequestOutgoingPayment= true;
    }

    const uniqueSellerIDs = new Set(this.selectedItems.map(i => i.IDVendor));

    this.selectedItems?.forEach((i) => {
      let notShowApprove = ['Draft',
        'Unapproved', 'Ordered', 'Approved', 'PORequestQuotation', 'Confirmed',
         'Shipping', 'PartiallyReceived', 'Received', 'Cancelled'];
      if (notShowApprove.indexOf(i.Status) > -1) {
        this.pageConfig.ShowApprove = false;
      }
      let notShowDisapprove = [ 'Draft', 'Unapproved', 'Ordered', 'PORequestQuotation',
        'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Cancelled'];
      if (notShowDisapprove.indexOf(i.Status) > -1) {
        this.pageConfig.ShowDisapprove = false;
      }

      let notShowCancel = [ 'Ordered', 'Approved', 'PORequestQuotation',
        'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Cancelled',];
      if (notShowCancel.indexOf(i.Status) > -1) {
        this.pageConfig.ShowCancel = false;
      }

      let notShowSubmit = ['Draft','Unapproved', 'Ordered', 'Submitted',
        'PORequestQuotation', 'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Cancelled',];
      if (notShowSubmit.indexOf(i.Status) > -1) {
        this.pageConfig.ShowSubmit = false;
      }
      let notShowDelete = ['Ordered', 'Approved', 'PORequestQuotation',
        'Confirmed', 'Shipping', 'PartiallyReceived', 'Received'];
      if (notShowDelete.indexOf(i.Status) > -1) {
        this.pageConfig.ShowDelete = false;
      }
      let notShowSubmitOrdersForApproval = ['Ordered', 'Submitted', 'Approved',
        'PORequestQuotation', 'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Cancelled'];
      if (notShowSubmitOrdersForApproval.indexOf(i.Status) > -1) {
        this.ShowSubmitForApproval = false;
      }

      let notShowRequestOutgoingPayment = ['Draft','Submitted', 'Approved',
        'PORequestQuotation', 'Confirmed', 'Shipping', 'PartiallyReceived', 'Received', 'Cancelled'];
      if (notShowRequestOutgoingPayment.indexOf(i.Status) != -1 ) {
        this.ShowRequestOutgoingPayment = false;
        this.IDBusinessPartner = null;
      }
      if (uniqueSellerIDs.size > 1) {
        this.ShowRequestOutgoingPayment = false;
        this.IDBusinessPartner = null;
      }
      else{
        this.IDBusinessPartner = [...uniqueSellerIDs][0];
      }
  
      
    });
    if(this.selectedItems?.length==0){
      this.ShowSubmitForApproval = false;
      this.pageConfig.ShowApprove = false;
      this.pageConfig.ShowDisapprove = false;
      this.pageConfig.ShowCancel = false;
      this.pageConfig.ShowDelete = false;
      this.ShowRequestOutgoingPayment = false;
    }
  }

}
