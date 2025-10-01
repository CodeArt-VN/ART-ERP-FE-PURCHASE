import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PurchaseQuotationItemsComponent } from './purchase-quotation-items.component';
import { PipesModule } from 'src/app/pipes/pipes.module';
@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, PipesModule, ShareModule, ReactiveFormsModule],
	declarations: [PurchaseQuotationItemsComponent],
	exports: [PurchaseQuotationItemsComponent],
})
export class PurchaseQuotationItemsComponentPageModule {}
