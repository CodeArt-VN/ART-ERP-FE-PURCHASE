import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  HRM_StaffProvider,
  PURCHASE_QuotationProvider,
  PURCHASE_RequestDetailProvider,
  PURCHASE_RequestProvider,
  WMS_ItemProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-purchase-quotation-detail',
  templateUrl: './purchase-quotation-detail.page.html',
  styleUrls: ['./purchase-quotation-detail.page.scss'],
  standalone: false,
})
export class PurchaseQuotationDetailPage extends PageBase {
  @ViewChild('importfile') importfile: any;
  statusList = [];
  statusLinesList = [];
  contentTypeList = [];
  markAsPristine = false;
  _currentVendor;
  _isVendorSearch = false;
  _vendorDataSource = this.buildSelectDataSource((term) => {
    return this.contactProvider.search({
      SkipAddress: true,
      IsVendor: true,
      SortBy: ['Id_desc'],
      Take: 20,
      Skip: 0,
      Term: term,
    });
  });

  _staffDataSource = this.buildSelectDataSource((term) => {
    return this.staffProvider.search({ Take: 20, Skip: 0, Term: term });
  });

  constructor(
    public pageProvider: PURCHASE_QuotationProvider,
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
      IDBusinessPartner: [''],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: [''],
      ForeignName: [''],
      Remark: [''],
      ForeignRemark: [''],
      ContentType: ['Item', Validators.required],
      Status: new FormControl({ value: 'Draft', disabled: true }, Validators.required),
      RequiredDate: [''],
      ValidUntilDate: [''],
      PostingDate: [''],
      DueDate: [''],
      DocumentDate: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),

      QuotationLines: this.formBuilder.array([]),
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
    Promise.all([this.env.getStatus('PurchaseQuotation'), 
      this.contactProvider.read({ IsVendor: true, Take: 20 }),
       this.env.getStatus('PurchaseQuotaionLine')]).then(
      (values: any) => {
        if (values[0]) this.statusList = values[0];
        if (values[1] && values[1].data) {
          this._vendorDataSource.selected.push(...values[1].data);
        }
        if(values[2]) this.statusLinesList = values[2];
        super.preLoadData(event);
      },
    );
  }

  loadedData(event) {
    if(this.item.Status != 'Open') this.pageConfig.canEdit = false;
    super.loadedData(event, true);
    this.setQuotationLines();
    if(this.item._Vendor){
      this._vendorDataSource.selected = [... this._vendorDataSource.selected,...[this.item._Vendor]]
    }
    this._vendorDataSource.initSearch();

  }

  async saveChange() {
    return super.saveChange2();
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  setQuotationLines() {
    this.formGroup.controls.QuotationLines = new FormArray([]);
    if (this.item?.QuotationLines.length)
      this.item?.QuotationLines.forEach((i) => {
        this.addLine(i);
      });
      if (!this.pageConfig.canEdit) {
        this.formGroup.controls.QuotationLines.disable();
      }
  }

  addLine(line, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.QuotationLines;
    let selectedItem = line._Item;
    let group = this.formBuilder.group({
      _IDItemDataSource: this.buildSelectDataSource((term) => {
        return this.itemProvider.search({
          IsVendorSearch: this.item.IDBusinessPartner ? true : false,
          IDVendor: this.item.IDBusinessPartner,
          IDPO: line.IDOrder,
          SortBy: ['Id_desc'],
          Take: 20,
          Skip: 0,
          Term: term,
        });
      }),
      _IDUoMDataSource: [selectedItem ? selectedItem.UoMs : []],
      IDItem: [line.IDItem || 0], //Validators.required
      IDItemUoM: new FormControl(
        line.IDItemUoM,
        this.item.contentType === 'Item' ? Validators.required : null, // Conditional validator
      ),
      Id: [line.Id],
      Status: ['Open'],
      Sort: [line.Sort],
      Name: [line.Name],
      Remark: [line.Remark],
      RequiredDate: [line.RequiredDate], //,Validators.required
      InfoPrice: new FormControl({value: line.InfoPrice , disabled : this.item?.SourceType != null}),
      Price: [line.Price,Validators.required],
      UoMName: [line.UoMName],
      Quantity: new FormControl(
        line.Quantity,
        this.item.ContentType === 'Item' ? Validators.required : null, // Conditional validator
      ),
      QuantityRemainingOpen : new FormControl({value:line.QuantityRemainingOpen, disabled:true}),
      QuantityRequired: new FormControl({ value: line.QuantityRequired, disabled: this.item?.SourceType != null }),
      UoMSwap: [line.UoMSwap],
      UoMSwapAlter: [line.UoMSwapAlter],
      IDTax: [line.IDTax], //,Validators.required
      TaxRate: new FormControl({ value: line.TaxRate, disabled: this.item?.SourceType != null}),

      TotalAfterTax: [line.TotalAfterTax],

      TotalBeforeDiscount: [line.TotalBeforeDiscount],

      TotalDiscount: [line.TotalDiscount],

      TotalAfterDiscount: [line.TotalAfterDiscount],
      _Item: [line._Item],
      Tax: new FormControl({ value: line.Tax, disabled: true }),
      IsDeleted: [line.IsDeleted],
      CreatedBy: [line.CreatedBy],
      ModifiedBy: [line.ModifiedBy],
      CreatedDate: [line.CreatedDate],
      DeletedLines : [],
      StatusText : lib.getAttrib(line.Status, this.statusLinesList, 'Name', '--', 'Code'),
      StatusColor : lib.getAttrib(line.Status, this.statusLinesList, 'Color', 'dark', 'Code')
    });
    groups.push(group);
    if (selectedItem) group.get('_IDItemDataSource').value.selected.push(selectedItem);
    group.get('_IDItemDataSource').value?.initSearch();

    if (markAsDirty) {
      group.get('Status').markAsDirty();
    }
  }


  removeLine(index) {
    let groups = <FormArray>this.formGroup.controls.QuotationLines;
    if(groups.controls[index].get('Id').value){
      this.env
      .showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
      .then((_) => {
        let Ids = [];
        Ids.push(groups.controls[index].get('Id').value);
        // this.removeItem.emit(Ids);
        if(Ids && Ids.length>0){
          // this.formGroup.get('DeletedLines').setValue(Ids);
          // this.formGroup.get('DeletedLines').markAsDirty();
          this.item.DeletedLines =Ids;
          this.pageProvider.save(this.item).then(s => {
            Ids.forEach(id=>{
              let index = groups.controls.findIndex((x) => x.get('Id').value == id);
              if(index >= 0) groups.removeAt(index);
            });
          });
        }
      })
      .catch((_) => { });
    }
    else  groups.removeAt(index);
  }

  calcTotalAfterTax() {
    if (this.formGroup.get('QuotationLines').getRawValue()) {
      return this.formGroup
        .get('QuotationLines')
        .getRawValue()
        .map((x) => (x.Price * x.Quantity - x.TotalDiscount) * (1 + x.TaxRate / 100))
        .reduce((a, b) => +a + +b, 0);
    } else {
      return 0;
    }
  }

  calcTotalDiscount() {
    return this.formGroup.controls.QuotationLines.getRawValue()
      .map((x) => x.TotalDiscount)
      .reduce((a, b) => +a + +b, 0);
  }


  // IDItemChange(e, group) {
  //   if (e) {
  //     if (e.PurchaseTaxInPercent && e.PurchaseTaxInPercent != -99) {
  //       group.controls._IDUoMDataSource.setValue(e.UoMs);
  //       group.controls.IDTax.setValue(e.IDPurchaseTaxDefinition);
  //       group.controls.IDTax.markAsDirty();
  //       if(e.UoMs?.length>0){
  //         group.controls.IDItemUoM.setValue(e.PurchasingUoM);
  //         group.controls.IDItemUoM.markAsDirty();
  //         var baseUoM = e.UoMs.find((d) => d.IsBaseUoM);
  //         if(baseUoM) { 
  //           group.controls.IDBaseUoM.setValue(baseUoM.Id);
  //           group.controls.IDItemUoM.markAsDirty();
  //         }
  //       }
  //       group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
  //       group.controls.TaxRate.markAsDirty();
  //       group.controls._Item.setValue(e._Item);

  //       if(!e._Vendors.some(o => o.Id == group.get('IDVendor').value))
  //         {
  //           group.get('IDVendor').setValue(null);
  //           group.get('IDVendor').markAsDirty();
  //         }
  //       group.controls._Vendors.setValue(e._Vendors)
        
  //       this.IDUoMChange(group);
  //       return;
  //     }
  //     if (e.PurchaseTaxInPercent != -99) this.env.showMessage('The item has not been set tax');
  //   }
  // }
  // IDUoMChange(group) {
  //   let idUoM = group.controls.IDItemUoM.value;

  //   if (idUoM) {
  //     let UoMs = group.controls._IDUoMDataSource.value;
  //     let u = UoMs.find((d) => d.Id == idUoM);
  //     if (u && u.PriceList) {
  //       let p = u.PriceList.find((d) => d.Type == 'PriceListForVendor');
  //       let taxRate = group.controls.TaxRate.value;
  //       if (p && taxRate != null) {
  //         let priceBeforeTax = null;

  //         if (taxRate < 0) taxRate = 0; //(-1 || -2) In case goods are not taxed

  //         if (p.IsTaxIncluded) {
  //           priceBeforeTax = p.Price / (1 + taxRate / 100);
  //         } else {
  //           priceBeforeTax = p.Price;
  //         }
  //         let baseUOM = UoMs.find((d) => d.IsBaseUoM);
  //         if(baseUOM) {
  //           group.controls.IDBaseUoM.setValue(baseUOM.Id);
  //           group.controls.IDBaseUoM.markAsDirty();
  //         }
  //         group.controls.UoMPrice.setValue(priceBeforeTax);
  //         group.controls.UoMPrice.markAsDirty();

  //         this.submitData(group);
  //         return;
  //       }
  //     }
  //   }
  //   else{
  //     group.controls.UoMPrice.setValue(null);
  //     group.controls.UoMPrice.markAsDirty();
  //     group.controls.IDBaseUoM.setValue(null);
  //     group.controls.IDBaseUoM.markAsDirty();
  //   }
  // }


  saveOrder() {
    this.debounce(() => {
      super.saveChange2();
    }, 300);
  }
}
