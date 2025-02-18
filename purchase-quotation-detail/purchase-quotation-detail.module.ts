import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { PurchaseQuotationDetailPage } from './purchase-quotation-detail.page';
import { CopyToPurchaseOrderModalPage } from '../copy-to-purchase-order-modal/copy-to-purchase-order-modal.page';

const routes: Routes = [
  {
    path: '',
    component: PurchaseQuotationDetailPage,
  },
];

@NgModule({
  imports: [CommonModule, FormsModule,IonicModule,ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
  declarations: [PurchaseQuotationDetailPage,CopyToPurchaseOrderModalPage],
  exports : []
})
export class PurchaseQuotationDetailPageModule {}
