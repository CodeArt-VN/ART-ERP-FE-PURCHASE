import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  HRM_StaffProvider,
  PURCHASE_OrderDetailProvider,
  PURCHASE_OrderProvider,
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
import { SaleOrderPickerModalPage } from '../sale-order-picker-modal/sale-order-picker-modal.page';

@Component({
    selector: 'app-purchase-request-detail',
    templateUrl: './purchase-request-detail.page.html',
    styleUrls: ['./purchase-request-detail.page.scss'],
    standalone: false
})
export class PurchaseRequestDetailPage extends PageBase {
  @ViewChild('importfile') importfile: any;
  branchList = [];
  vendorList = [];
  statusList = [];
  contentTypeList = [];
  markAsPristine = false;
  _vendorDataSource = {
    searchProvider: this.contactProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    that: this,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) => {
            if (!term) {
              this.loading = false;
              return of(this.selected);
            } else {
              return this.searchProvider
                .search({
                  Term: term,
                  SortBy: ['Id_desc'],
                  Take: 20,
                  Skip: 0,
                  IsVendor: true,
                  SkipAddress: true,
                })
                .pipe(
                  catchError(() => of([])), // empty list on error
                  tap(() => (this.loading = false)),
                );
            }
          }),
        ),
      );
    },
    addSelectedItem(items) {
      this.selected = [...items];
    },
  };

  _staffDataSource = {
    searchProvider: this.staffProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
              catchError(() => of([])), // empty list on error
              tap(() => (this.loading = false)),
            ),
          ),
        ),
      );
    },
  };


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
      Remark: ['',Validators.required],
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
      ModifiedBy:new FormControl({ value: '', disabled: true }),
      CreatedDate:new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),

      OrderLines: this.formBuilder.array([]),
      TotalDiscount: new FormControl({ value: '', disabled: true }),
      TotalAfterTax: new FormControl({ value: '', disabled: true }),
    });
  }

  preLoadData(event) {
    this.contentTypeList = [{ Code: 'Item', Name: 'Item' }, { Code: 'Service', Name: 'Service' }];
    Promise.all(
      [this.env.getStatus('PurchaseRequest'),
      this.contactProvider.read({ IsVendor: true, Take: 20 }),]
    ).then((values: any) => {
      if (values[0]) this.statusList = values[0];
      if (values[1] && values[1].data) {
        this._vendorDataSource.selected.push(...values[1].data);
      }
      super.preLoadData(event);
    });

  }


  loadedData(event) {
    if (this.item) { 
      if (!(this.item.Status == 'Draft')) {
        this.pageConfig.canEdit = false;
      }
    }
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
      this._vendorDataSource.selected = [...this._vendorDataSource.selected,...[this.item?._Vendor]]
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
  }

  removeItem(Ids) {
    this.purchaseRequestDetailProvider.delete(Ids).then((resp) => {
      this.env.publishEvent({ Code: this.pageConfig.pageName });
      this.env.showMessage('Deleted!', 'success');
    });
  }

  renderFormArray(e){
    this.formGroup.controls.OrderLines = e;
  }

  saveOrderBack() {
    this.saveChange();
  }

  calcTotalAfterTax() {
    if (this.formGroup.get('OrderLines').getRawValue()){
      return this.formGroup.get('OrderLines').getRawValue()
        .map((x) => (x.UoMPrice *  x.Quantity - x.TotalDiscount) * (1 + x.TaxRate / 100))
        .reduce((a, b) => +a + +b, 0);
    } else {
      return 0;
    }
  }


  changeDate(e) {
    if(!this.formGroup.get('DocumentDate').value){
      this.formGroup.get('DocumentDate').setValue(e.target.value)
      this.formGroup.get('DocumentDate').markAsDirty();
    }
    if(!this.formGroup.get('PostingDate').value){
      this.formGroup.get('PostingDate').setValue(e.target.value)
      this.formGroup.get('PostingDate').markAsDirty();
    }
    if(!this.formGroup.get('DueDate').value){
      this.formGroup.get('DueDate').setValue(e.target.value)
      this.formGroup.get('DueDate').markAsDirty();
    }
    this.saveChange();
  }

  changeRequiredDate() {
    let orderLines = this.formGroup.get('OrderLines') as FormArray;
    orderLines.controls.forEach(o => {
      if (!o.get('RequiredDate').value){
        o.get('RequiredDate').setValue(this.formGroup.get('RequiredDate').value);
        o.get('RequiredDate').markAsDirty();
      } 
    })
    this.saveChange();
  }

  async copyToPO(){
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
    super.saveChange2();

  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }


}
