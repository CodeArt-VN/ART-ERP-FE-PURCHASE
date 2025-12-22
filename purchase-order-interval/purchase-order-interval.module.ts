import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseOrderIntervalPage } from './purchase-order-interval.page';
import { ShareModule } from 'src/app/share.module';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: PurchaseOrderIntervalPage }])],
	declarations: [PurchaseOrderIntervalPage],
})
export class PurchaseOrderIntervalPageModule {}
