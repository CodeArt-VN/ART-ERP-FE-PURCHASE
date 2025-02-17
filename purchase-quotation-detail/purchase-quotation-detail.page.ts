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

@Component({
  selector: 'app-purchase-quotation-detail',
  templateUrl: './purchase-quotation-detail.page.html',
  styleUrls: ['./purchase-quotation-detail.page.scss'],
  standalone: false,
})
export class PurchaseQuotationDetailPage extends PageBase {
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
   
    Promise.all([this.env.getStatus('PurchaseRequest'), this.contactProvider.read({ IsVendor: true, Take: 20 })]).then(

    );
    super.preLoadData(event);
  }

  loadedData(event) {
    super.loadedData(event, true);
  }

  async saveChange() {
    return super.saveChange2();
  }

 
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

}
