import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { PurchaseQuotationDetailPage } from './purchase-quotation-detail.page';
import { CopyFromPurchaseQuotationToPurchaseOrder } from '../copy-from-purchase-quotation-to-purchase-order-modal/copy-from-purchase-quotation-to-purchase-order-modal.page';
import { ItemPlanningDataModalPage } from '../item-planning-data-modal/item-planning-data-modal.page';
import { PurchaseQuotationItemsComponentPageModule } from './purchase-quotation-items/purchase-quotation-items.component.module';

const routes: Routes = [
	{
		path: '',
		component: PurchaseQuotationDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, PurchaseQuotationItemsComponentPageModule, RouterModule.forChild(routes)],
	declarations: [PurchaseQuotationDetailPage, CopyFromPurchaseQuotationToPurchaseOrder,ItemPlanningDataModalPage],
	exports: [],
})
export class PurchaseQuotationDetailPageModule {}
