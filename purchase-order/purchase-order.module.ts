import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseOrderPage } from './purchase-order.page';
import { ShareModule } from 'src/app/share.module';
import { SearchAsyncPopoverPage } from '../search-async-popover/search-async-popover.page';
import { PurchaseOrderModalPageModule } from '../purchase-request-detail/purchase-order-modal/purchase-order-modal.module';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, PurchaseOrderModalPageModule, RouterModule.forChild([{ path: '', component: PurchaseOrderPage }])],
	declarations: [PurchaseOrderPage, SearchAsyncPopoverPage],
	exports: [SearchAsyncPopoverPage],
})
export class PurchaseOrderPageModule {}
