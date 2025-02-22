import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PurchaseRequestPage } from './purchase-request.page';
import { ShareModule } from 'src/app/share.module';
import { PriceListVersionModalPage } from '../pricelist-version-modal/pricelist-version-modal.page';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, RouterModule.forChild([{ path: '', component: PurchaseRequestPage }])],
	declarations: [PurchaseRequestPage],
})
export class PurchaseRequestPageModule {}
