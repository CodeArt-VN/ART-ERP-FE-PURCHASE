import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { PurchaseRequestDetailPage } from './purchase-request-detail.page';
import { PurchaseOrderModalPage } from '../purchase-order-modal/purchase-order-modal.page';

const routes: Routes = [
  {
    path: '',
    component: PurchaseRequestDetailPage,
  },
];

@NgModule({
  imports: [CommonModule, FormsModule,IonicModule,ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
  declarations: [PurchaseRequestDetailPage,PurchaseOrderModalPage],
  exports : [PurchaseOrderModalPage]
})
export class PurchaseRequestDetailPageModule {}
