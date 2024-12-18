import { Component, ChangeDetectorRef, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { PROD_ItemInVendorProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';

import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, mergeMap, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-purchase-items',
  templateUrl: './purchase-items.component.html',
  styleUrls: ['./purchase-items.component.scss'],
})
export class PurchaseItemsComponent extends PageBase {
  _preloadItems;

  @Input() set orderLines(value: any) {
    this.items = value;
    this.setOrderLines();
  };

  @Input() set markAsPristine(value: any) {
    if(value)this.formGroup.markAsPristine();
  };

  @Input() canEdit: any;

  @Output() onChange = new EventEmitter<any>();
  @Output() renderFormArray = new EventEmitter<any>();
  @Output() removeItem = new EventEmitter<any>();
  constructor(
    public pageProvider: PROD_ItemInVendorProvider,
    public itemProvider: WMS_ItemProvider,
    public env: EnvService,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.formGroup = this.formBuilder.group({
      OrderLines: this.formBuilder.array([]),
    });
  }

  loadData(){
    super.loadedData();
  }
  setOrderLines() {
    this.formGroup.controls.OrderLines = new FormArray([]);
    if (this.items?.length)
      this.items?.forEach((i) => {
        this.addLine(i);
      });
      if (!this.canEdit) this.formGroup.disable();
      this.renderFormArray.emit(this.formGroup.controls.OrderLines);
  }

  addLine(line, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.OrderLines;
    let selectedItem = line._Item;

    let group = this.formBuilder.group({
      _IDItemDataSource: [
        {
          searchProvider: this.itemProvider,
          loading: false,
          input$: new Subject<string>(),
          selected:selectedItem? [selectedItem]:[],
          items$: null,
          initSearch() {
            this.loading = false;
            this.items$ = concat(
              of(this.selected),
              this.input$.pipe(
                distinctUntilChanged(),
                tap(() => (this.loading = true)),
                switchMap((term) =>
                  this.searchProvider
                    .search({
                      ARSearch: true,
                      IDPO: line.IDOrder,
                      SortBy: ['Id_desc'],
                      Take: 20,
                      Skip: 0,
                      Term: term,
                    })
                    .pipe(
                      catchError(() => of([])), // empty list on error
                      tap(() => (this.loading = false)),
                    ),
                ),
              ),
            );
          },
        },
      ],
      _IDUoMDataSource: [selectedItem ? selectedItem.UoMs : ''],
      IDItem: [line.IDItem || 0],
      IDRequest: [line.IDRequest],//Validators.required
      IDItemUoM: [line.IDItemUoM,Validators.required],//, Validators.required
      IDBaseUoM: [line.IDBaseUoM],
      IDVendor: [line.IDVendor],
      Id: [line.Id],
      Sort: [line.Sort],
      Name: [line.Name],
      Status: new FormControl({ value: line.Status || 'Open', disabled: true }),
      Remark: [line.Remark],
      RequiredDate: [line.RequiredDate],//,Validators.required
      UoMPrice: [line.UoMPrice, Validators.required],
      Quantity: [line.Quantity, Validators.required],
      QuantityRemainingOpen: [line.QuantityRemainingOpen],
      UoMSwap: [line.UoMSwap],
      UoMSwapAlter: [line.UoMSwapAlter],
      IDTax: [line.IDTax], //,Validators.required
      TaxRate: [line.TaxRate],

      TotalAfterTax: [line.TotalAfterTax],

      TotalBeforeDiscount: [line.TotalBeforeDiscount],

      TotalDiscount: [line.TotalDiscount],

      TotalAfterDiscount: [line.TotalAfterDiscount],
      Tax: new FormControl({ value: line.Tax, disabled: true }),
      IsDeleted: [line.IsDeleted],
      CreatedBy: [line.CreatedBy],
      ModifiedBy: [line.ModifiedBy],
      CreatedDate: [line.CreatedDate],
      _Item : [line._Item],
    });
    groups.push(group);

    group.get('_IDItemDataSource').value?.initSearch();

    if (markAsDirty) {
      group.get('Status').markAsDirty();
    }
  }

  removeLine(index) {
    let groups = <FormArray>this.formGroup.controls.OrderLines;
    if(groups.controls[index].get('Id').value){
      this.env
      .showPrompt('Bạn có chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm')
      .then((_) => {
        let Ids = [];
        Ids.push({Id :groups.controls[index].get('Id').value});
        groups.removeAt(index);
        this.removeItem.emit(Ids);
      })
      .catch((_) => { });
    }
    else  groups.removeAt(index);
  }

  IDItemChange(e, group) {
    if (e) {
      if (e.PurchaseTaxInPercent && e.PurchaseTaxInPercent != -99) {
        group.controls._IDUoMDataSource.setValue(e.UoMs);
        group.controls.IDTax.setValue(e.IDPurchaseTaxDefinition);
        group.controls.IDTax.markAsDirty();

        group.controls.IDItemUoM.setValue(e.PurchasingUoM);
        group.controls.IDItemUoM.markAsDirty();

        group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
        group.controls.TaxRate.markAsDirty();
        
        this.IDUoMChange(group);
        return;
      }
      group.controls._Item.setValue(e);
      if (e.PurchaseTaxInPercent != -99) this.env.showMessage('The item has not been set tax');
    }
  }
  IDUoMChange(group) {
    let idUoM = group.controls.IDItemUoM.value;

    if (idUoM) {
      let UoMs = group.controls._IDUoMDataSource.value;
      let u = UoMs.find((d) => d.Id == idUoM);
      if (u && u.PriceList) {
        let p = u.PriceList.find((d) => d.Type == 'PriceListForVendor');
        let taxRate = group.controls.TaxRate.value;
        if (p && taxRate != null) {
          let priceBeforeTax = null;

          if (taxRate < 0) taxRate = 0; //(-1 || -2) In case goods are not taxed

          if (p.IsTaxIncluded) {
            priceBeforeTax = p.Price / (1 + taxRate / 100);
          } else {
            priceBeforeTax = p.Price;
          }

          group.controls.UoMPrice.setValue(priceBeforeTax);
          group.controls.UoMPrice.markAsDirty();

          this.submitData(group);
          return;
        }
      }
    }
    group.controls.UoMPrice.setValue(null);
    group.controls.UoMPrice.markAsDirty();
  }


  submitData(g) {
    if (!g.valid) {
      let invalidControls = super.findInvalidControlsRecursive(this.formGroup); 
      const translationPromises = invalidControls.map(control => this.env.translateResource(control));
      Promise.all(translationPromises).then((values) => {
        let invalidControlsTranslated = values;
        this.env.showMessage('Please recheck control(s): {{value}}', 'warning', invalidControlsTranslated.join(' | '));
        });
    }
    else{
      this.onChange.emit(g);
    }
  }

  calcTotalDiscount() {
    return this.formGroup.controls.OrderLines.getRawValue()
      .map((x) => x.TotalDiscount)
      .reduce((a, b) => +a + +b, 0);
  }
  calcTotalAfterTax() {
    return this.formGroup.controls.OrderLines.getRawValue()
      .map((x) => (x.UoMPrice * (x.UoMQuantityExpected + x.QuantityAdjusted) - x.TotalDiscount) * (1 + x.TaxRate / 100))
      .reduce((a, b) => +a + +b, 0);
  }

}
