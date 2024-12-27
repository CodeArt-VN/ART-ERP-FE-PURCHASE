import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  HRM_StaffProvider,
  PURCHASE_RequestDetailProvider,
  PURCHASE_RequestProvider,
  WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PurchaseOrderModalPage } from '../purchase-order-modal/purchase-order-modal.page';

@Component({
  selector: 'app-purchase-request-detail',
  templateUrl: './purchase-request-detail.page.html',
  styleUrls: ['./purchase-request-detail.page.scss'],
  standalone: false,
})
export class PurchaseRequestDetailPage extends PageBase {
  @ViewChild('importfile') importfile: any;
  statusList = [];
  contentTypeList = [];
  markAsPristine = false;
  _currentVendor;
  _isVendorSearch = false;
  _vendorDataSource = this.buildSelectDataSource((term) => {
    return this.contactProvider.search({  SkipAddress: true, IsVendor: true, SortBy: ['Id_desc'],Take: 20, Skip: 0, Term: term });
  });
  

  _staffDataSource = this.buildSelectDataSource((term) => {
    return this.staffProvider.search({  Take: 20, Skip: 0, Term: term });
  });

  constructor(
    public pageProvider: PURCHASE_RequestProvider,
    public purchaseRequestDetailProvider: PURCHASE_RequestDetailProvider,
    public contactProvider: CRM_ContactProvider,
    public branchProvider: BRA_BranchProvider,
    public itemProvider: WMS_ItemProvider,
    public popoverCtrl: PopoverController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
    public staffProvider: HRM_StaffProvider,
  ) {
    super();
    this.pageConfig.isDetailPage = true;

    this.formGroup = this.formBuilder.group({
      IDBranch: [this.env.selectedBranch, Validators.required],
      IDRequester: [''],
      IDRequestBranch: [''],
      //  IDStorer: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
      IDVendor: [''],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: [''],
      ForeignName: [''],
      Remark: [''],
      ForeignRemark: [''],
      ContentType: ['Item', Validators.required],
      Status: new FormControl({ value: 'Draft', disabled: true }, Validators.required),
      RequiredDate: [''],
      PostingDate: [''],
      DueDate: [''],
      DocumentDate: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),

      OrderLines: this.formBuilder.array([]),
      TotalDiscount: new FormControl({ value: '', disabled: true }),
      TotalAfterTax: new FormControl({ value: '', disabled: true }),
      DeletedLines: [''],
    });
  }

  preLoadData(event) {
    this.contentTypeList = [
      { Code: 'Item', Name: 'Items' },
      { Code: 'Service', Name: 'Service' },
    ];
    Promise.all([this.env.getStatus('PurchaseRequest'), this.contactProvider.read({ IsVendor: true, Take: 20 })]).then(
      (values: any) => {
        if (values[0]) this.statusList = values[0];
        if (values[1] && values[1].data) {
          this._vendorDataSource.selected.push(...values[1].data);
        }
        super.preLoadData(event);
      },
    );
  }

  loadedData(event) {
    //this.setOrderLines();
    // this.formGroup.get('Type').markAsDirty();
    if (!this.item.Id) {
      this.item.IDRequester = this.env.user.StaffID;
      this.item._Requester = {
        Id: this.env.user.StaffID,
        FullName: this.env.user.FullName,
      };
    }
    super.loadedData(event, true);
    if (this.item?._Vendor) {
      this._vendorDataSource.selected = [...this._vendorDataSource.selected, ...[this.item?._Vendor]];
    }

    if (this.item._Requester) {
      this._staffDataSource.selected.push(lib.cloneObject(this.item._Requester));
    }

    this._staffDataSource.initSearch();
    this._vendorDataSource.initSearch();

    if (!this.item.Id) {
      this.formGroup.controls['IDRequester'].markAsDirty();
      this.formGroup.controls['ContentType'].markAsDirty();
    }
    this.calcTotalAfterTax();
    if (this.item._Vendor) {
      this._currentVendor = this.item._Vendor;
    }
    this._currentContentType = this.formGroup.controls['ContentType'].value;
    if(this.formGroup.get('Id').value && this.formGroup.get('Status').value != 'Draft' && this.formGroup.get('Status').value != 'Unapproved'){
      this.formGroup.disable();
      this.pageConfig.canEdit = false;
    }
  }

  removeItem(Ids) {
    let groups = <FormArray>this.formGroup.controls.OrderLines;
    if(Ids && Ids.length>0){
      this.formGroup.get('DeletedLines').setValue(Ids);
      this.formGroup.get('DeletedLines').markAsDirty();
      this.saveChange().then(s=>{
        Ids.forEach(id=>{
          let index = groups.controls.findIndex((x) => x.get('Id').value == id);
          if(index >= 0) groups.removeAt(index);
        });
      });
    }
  }

  renderFormArray(e) {
    this.formGroup.controls.OrderLines = e;
  }

  saveOrderBack() {
    this.saveChange();
  }
  _currentContentType;
  changeContentType(e){
    console.log(e);
    let orderLines = this.formGroup.get('OrderLines') as FormArray;
    if (orderLines.controls.length > 0) {
      this.env
        .showPrompt(
          'Tất cả hàng hoá trong danh sách sẽ bị xoá khi bạn chọn nhà cung cấp khác. Bạn chắc chắn chứ? ',
          null,
          'Thông báo',
        )
        .then(() => {
          let DeletedLines = orderLines
            .getRawValue()
            .filter((f) => f.Id)
            .map((o) => o.Id);
          this.formGroup.get('DeletedLines').setValue(DeletedLines);
          this.formGroup.get('DeletedLines').markAsDirty();
          orderLines.clear();
          this.item.OrderLines = [];
          console.log(orderLines);
          console.log(this.item.OrderLines);
          this.saveChange();
          this._currentContentType = e.Code;
          return;
        })
        .catch(() => {
          this.formGroup.get('ContentType').setValue(this._currentContentType);
        });
    }else{
      this._currentContentType = e.Code;
      this.saveChange();
    }
  }

  calcTotalAfterTax() {
    if (this.formGroup.get('OrderLines').getRawValue()) {
      return this.formGroup
        .get('OrderLines')
        .getRawValue()
        .map((x) => (x.UoMPrice * x.Quantity - x.TotalDiscount) * (1 + x.TaxRate / 100))
        .reduce((a, b) => +a + +b, 0);
    } else {
      return 0;
    }
  }

  changeDate(e) {
    if (!this.formGroup.get('DocumentDate').value) {
      this.formGroup.get('DocumentDate').setValue(e.target.value);
      this.formGroup.get('DocumentDate').markAsDirty();
    }
    if (!this.formGroup.get('PostingDate').value) {
      this.formGroup.get('PostingDate').setValue(e.target.value);
      this.formGroup.get('PostingDate').markAsDirty();
    }
    if (!this.formGroup.get('DueDate').value) {
      this.formGroup.get('DueDate').setValue(e.target.value);
      this.formGroup.get('DueDate').markAsDirty();
    }
    this.saveChange();
  }

  changeVendor(e) {
    let orderLines = this.formGroup.get('OrderLines') as FormArray;
    
      if (orderLines.controls.length > 0) {
        if(e){
        this.env
          .showPrompt(
            'Tất cả hàng hoá trong danh sách khác với nhà cung cấp được chọn sẽ bị xoá. Bạn có muốn tiếp tục ? ',
            null,
            'Thông báo',
          )
          .then(() => {
            let DeletedLines = orderLines
              .getRawValue()
              .filter((f) => f.Id && (f.IDVendor != e.Id && !(f._Vendors?.map(v => v.Id)?.includes(e.Id))))
              .map((o) => o.Id);
            this.formGroup.get('DeletedLines').setValue(DeletedLines);
            this.formGroup.get('DeletedLines').markAsDirty();
            this.saveChange();
            this._currentVendor = e;
          })
          .catch(() => {
            this.formGroup.get('IDVendor').setValue(this._currentVendor?.Id);
          })
        }
        else {
          this._currentVendor = e;
          this.saveChange()
        };;
    }
    else{
      this._currentVendor = e;
      this.saveChange();
    }
  }

  changeRequiredDate() {
    let orderLines = this.formGroup.get('OrderLines') as FormArray;
    orderLines.controls.forEach((o) => {
      if (!o.get('RequiredDate').value) {
        o.get('RequiredDate').setValue(this.formGroup.get('RequiredDate').value);
        o.get('RequiredDate').markAsDirty();
      }
    });
    this.saveChange();
  }

  async copyToPO() {
    const loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait for a few moments',
    });
    await loading.present().then(() => {
      this.commonService
        .connect('POST', ApiSetting.apiDomain('PURCHASE/Request/CopyToPO/'), this.item.Id)
        .toPromise()
        .then((resp: any) => {
          if (loading) loading.dismiss();
          this.env.publishEvent({
            Code: this.pageConfig.pageName,
          });
        })
        .catch((err) => {
          console.log(err);
          this.env.showMessage('erp.app.pages.purchase.purchase-request.message.can-not-add', 'danger');
          if (loading) loading.dismiss();
        });
    });
  }

  
  async saveChange() {
    return super.saveChange2();
  }

  savedChange(savedItem = null, form = this.formGroup) {
    if (savedItem) {
      this.item = savedItem;
      this.formGroup.patchValue(savedItem);
      if (form.controls.Id && savedItem.Id && form.controls.Id.value != savedItem.Id)
        form.controls.Id.setValue(savedItem.Id);
      if (this.pageConfig.isDetailPage && form == this.formGroup && this.id == 0) {
        this.id = savedItem.Id;
        if (window.location.hash.endsWith('/0')) {
          let newURL = window.location.hash.substring(0, window.location.hash.length - 1) + savedItem.Id;
          history.pushState({}, null, newURL);
        }
      }
    }
    form.markAsPristine();
    this.cdr.detectChanges();
    this.submitAttempt = false;
    this.env.showMessage('Saving completed!', 'success');
  }
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async createPO() {
    let orderLines = this.formGroup.get('OrderLines').value.filter((d) => d.Id);
    
    const modal = await this.modalController.create({
      component: PurchaseOrderModalPage,
      componentProps: {
        orderLines: orderLines,
        defaultVendor: this._currentVendor,
      },

      cssClass: 'modal90',
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data && data.IDVendor && data.OrderLines.length > 0) {
      const loading = await this.loadingController.create({
        cssClass: 'my-custom-class',
        message: 'Xin vui lòng chờ tạo PO...',
      });
      await loading.present().then(() => {
        let postData = {
          // SelectedRecommendations: this.items.filter((d) => d.checked).map((m) => ({ Id: m.Id, IDVendor: m.VendorId })),
          IDVendor: data.IDVendor,
          IDOrderlines: data.OrderLines.map((o) => o.Id),
        };
        this.commonService
          .connect('POST', 'PURCHASE/Request/CopyToPO/' + this.formGroup.get('Id').value, postData)
          .toPromise()
          .then((resp: any) => {
            if (resp) {
              if (loading) loading.dismiss();
              this.env.showMessage('PO created!', 'success');
              this.env
                .showPrompt('Create purchase order successfully!', 'Do you want to navigate to purchase order ?')
                .then((d) => {
                  this.nav('/purchase-order/' + resp.Id, 'forward');
                });
              this.refresh();
              this.env.publishEvent({
                Code: this.pageConfig.pageName,
              });
            }
          })
          .catch((err) => {
            console.log(err);
            this.env.showMessage('Cannot create PO, please try again later', 'danger');
            if (loading) loading.dismiss();
          });
      });
    }
  }
}
