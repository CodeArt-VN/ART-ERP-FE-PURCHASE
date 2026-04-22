import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ShareModule } from 'src/app/share.module';
import { PurchaseRequestDetailPage } from './purchase-request-detail.page';
import { PurchaseItemsComponentPageModule } from './purchase-items/purchase-items.component.module';
import { PurchaseOrderModalPageModule } from './purchase-order-modal/purchase-order-modal.module';
import { PurchaseQuotationModalPage } from './purchase-quotation-modal/purchase-quotation-modal.page';
import { PriceListVersionModalPage } from '../pricelist-version-modal/pricelist-version-modal.page';
import { IntervalItemModalComponent } from './interval-item-modal/interval-item-modal';

const routes: Routes = [
	{
		path: '',
		component: PurchaseRequestDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, PurchaseItemsComponentPageModule, PurchaseOrderModalPageModule, ShareModule, RouterModule.forChild(routes)],
	declarations: [PurchaseRequestDetailPage, PurchaseQuotationModalPage, PriceListVersionModalPage, IntervalItemModalComponent],
	exports: [PurchaseQuotationModalPage, PriceListVersionModalPage, IntervalItemModalComponent],
})
export class PurchaseRequestDetailPageModule {}
