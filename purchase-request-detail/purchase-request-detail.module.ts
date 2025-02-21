import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { PurchaseRequestDetailPage } from './purchase-request-detail.page';
import { PurchaseItemsComponentPageModule } from './purchase-items/purchase-items.component.module';
import { PurchaseOrderModalPage } from './purchase-order-modal/purchase-order-modal.page';
import { PurchaseQuotationModalPage } from './purchase-quotation-modal/purchase-quotation-modal.page';
import { PriceListVersionModalPage } from '../pricelist-version-modal/pricelist-version-modal.page';

const routes: Routes = [
  {
    path: '',
    component: PurchaseRequestDetailPage,
  },
];

@NgModule({
  imports: [CommonModule, FormsModule,IonicModule,ReactiveFormsModule, PurchaseItemsComponentPageModule,ShareModule, RouterModule.forChild(routes)],
  declarations: [PurchaseRequestDetailPage,PurchaseOrderModalPage,PurchaseQuotationModalPage,PriceListVersionModalPage],
  exports : [PurchaseOrderModalPage,PurchaseQuotationModalPage,PriceListVersionModalPage]
})
export class PurchaseRequestDetailPageModule {}
