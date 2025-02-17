import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { PROD_ItemInVendorProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-purchase-quotation-modal',
  templateUrl: './purchase-quotation-modal.page.html',
  styleUrls: ['./purchase-quotation-modal.page.scss'],
  standalone : false
})
export class PurchaseQuotationModalPage extends PageBase {


  @Input() itemInVendors: any;
  @Input() isMultiple: any = false;
  @Input() defaultVendor :any;
  vendorList : any = [];
  formGroup;
  constructor(
    public modal: ModalController,
    public itemInVendorProvider: PROD_ItemInVendorProvider,
    public route: ActivatedRoute,
    public router: Router,
    public navCtrl: NavController,
    public env: EnvService,
    public pageProvider: PROD_ItemInVendorProvider,
    public formBuilder : FormBuilder

  ) {
    super();
    this.formGroup = this.formBuilder.group({
      IDVendor : new FormControl({value:'',disabled:true})
    });
    
  }

  preLoadData(event?: any): void {
    // if (this.itemInVendors){

    //   this.query.IDItem = this.itemInVendors.map(d=> d.IDItem);
    // } 
    // super.preLoadData();
    this.loadData(event);
  }

  loadData(event?: any): void {
    this.loadedData();
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
 
    console.log(this.items);
    this.itemInVendors = this.itemInVendors?.map(d => {

      if(d.IDVendor == null){
        d._Vendors.forEach(v=> {v.checked = true ; this.vendorList.push(v)})//= (v.Id == d.IDVendor)
        return {...d, Quantity: d.Quantity, UoMName: d.UoMName,IDDetail:d.IDDetail,UoMPrice : d.UoMPrice} ;
      } else{
        d._Vendors = d._Vendors.filter(v=> v.Id == d.IDVendor)
        d._Vendors.forEach(v=> {v.checked = true ; this.vendorList.push(v)})//= (v.Id == d.IDVendor)
        return {...d, Quantity: d.Quantity, UoMName: d.UoMName,IDDetail:d.IDDetail,UoMPrice : d.UoMPrice} ;
      }
      return d;
    });
    this.formGroup.controls.IDVendor.setValue(this.defaultVendor.Id);
    this.items=this.itemInVendors;

    console.log(this.items)
  }


  changeVendor(i, index) {
    if (!this.isMultiple) {
      if (i._Vendors[index].checked) {
        i._Vendors.forEach(d => d.checked = false)
        i._Vendors[index].checked = true;
      }
    }
  }
  

  submitForm() {
    let obj = this.itemInVendors.map(d=>{return {
      IDItem : d.IDItem,
      IDUoM : d. IDItemUoM,
      Vendors: d._Vendors.map(v=> {
        if(v.checked) return v.Id;
      })
    }});
    console.log(obj);
    
    this.modal.dismiss(obj);
  }
}
