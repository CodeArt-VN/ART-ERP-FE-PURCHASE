import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PurchaseOrderItemsComponent } from './purchase-order-items.component';
import { PipesModule } from 'src/app/pipes/pipes.module';
@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, PipesModule, ShareModule, ReactiveFormsModule],
	declarations: [PurchaseOrderItemsComponent],
	exports: [PurchaseOrderItemsComponent],
})
export class PurchaseOrderItemsComponentPageModule {}
