import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, CRM_ContactProvider, WMS_ItemProvider, PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
@Component({
    selector: 'app-purchase-order-modal',
    templateUrl: './purchase-order-modal.page.html',
    styleUrls: ['./purchase-order-modal.page.scss'],
    standalone: false
})
export class PurchaseOrderModalPage extends PageBase {
  storerList = [];
  branchList = [];
  preloadIDVendors : any;
  preloadVendors = [];
  defaultVendor ;
  orderLines;
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
      this.selected = [ ...this.selected,...items.filter(d=>!this.selected.map(s=> s.Id).includes( d.Id))];
    },
  };

  constructor(
    public pageProvider: PURCHASE_OrderProvider,
    public contactProvider: CRM_ContactProvider,
    public itemProvider: WMS_ItemProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
  ) {
    super();

    this.pageConfig.isDetailPage = true;

    this.formGroup = formBuilder.group({
      IDVendor: ['', Validators.required],
    });
  }

  preLoadData(event?: any): void {
    this.id = 0;
			this._vendorDataSource.selected = [...this.preloadVendors];

      this.loadedData(event);
    }
  loadedData(event){
    super.loadedData(event);
    this.orderLines = [...this.orderLines]
    if(this.defaultVendor?.Id){
      this._vendorDataSource.selected = [...this._vendorDataSource.selected ,this.defaultVendor];
      this.formGroup.get('IDVendor').setValue(this.defaultVendor.Id);
      this.orderLines.forEach(i=>{
        i.disabled = i.IDVendor != this.defaultVendor.Id;
        i.checked = i.IDVendor ==  this.defaultVendor.Id;
        this.changeSelection(i);

      });
    }
    this._vendorDataSource.initSearch();
  };
  
  submit() {
    this.formGroup.updateValueAndValidity();
    if (!this.formGroup.valid) {
      this.env.showMessage('Please recheck information highlighted in red above', 'warning');
    } else {
      let submitItem:any = this.formGroup.value;
      let orderLines = this.orderLines.filter(i => i.checked && !i.disabled);
      submitItem.OrderLines = orderLines; 
      this.modalController.dismiss(submitItem);
    }
  }

  isAllChecked = false;
  toggleSelectAll() {
    this.isAllChecked = !this.isAllChecked;
    this.selectedItems = [];
    // let groups = this.formGroup.get('OrderLines') as FormArray;
    this.orderLines.forEach((i) =>{
      if( this.isAllChecked){
        if(i.IDVendor == this.formGroup.get('IDVendor').value){
          i.checked = this.isAllChecked;
        } 
      }
      else i.checked = this.isAllChecked;
      super.changeSelection(i);
    })
    // this.selectedItems = this.isAllChecked ? [...this.items.filter(d=> d.checked)] : [];
  }
 changeVendor(e){
  this.orderLines.forEach(i=>{
    i.disabled = i.IDVendor != e.Id;
    i.checked = i.IDVendor == e.Id;
    super.changeSelection(i);

  });
 }
 changeSelection(i, e = null){
  i.checked = !i.checked;
  super.changeSelection(i);
 }
}
