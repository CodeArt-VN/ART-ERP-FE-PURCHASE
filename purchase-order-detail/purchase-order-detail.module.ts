import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { PurchaseOrderDetailPage } from './purchase-order-detail.page';
import { SaleOrderPickerModalPage } from '../sale-order-picker-modal/sale-order-picker-modal.page';
import { CopyToReceiptModalPage } from '../copy-to-receipt-modal/copy-to-receipt-modal.page';

const routes: Routes = [
	{
		path: '',
		component: PurchaseOrderDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [PurchaseOrderDetailPage, SaleOrderPickerModalPage, CopyToReceiptModalPage],
})
export class PurchaseOrderDetailPageModule {}
