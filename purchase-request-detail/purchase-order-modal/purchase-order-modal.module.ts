import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { ShareModule } from 'src/app/share.module';
import { PurchaseOrderModalPage } from './purchase-order-modal.page';

@NgModule({
	imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, IonicModule, TranslateModule, ShareModule],
	declarations: [PurchaseOrderModalPage],
	exports: [PurchaseOrderModalPage],
})
export class PurchaseOrderModalPageModule {}
