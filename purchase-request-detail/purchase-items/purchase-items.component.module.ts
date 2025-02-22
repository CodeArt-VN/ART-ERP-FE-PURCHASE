import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PurchaseItemsComponent } from './purchase-items.component';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ShareInputControlsModule } from 'src/app/components/controls/share-input-controls.modules';

@NgModule({
	imports: [IonicModule, CommonModule, FormsModule, ShareModule, PipesModule, ShareModule, ReactiveFormsModule],
	declarations: [PurchaseItemsComponent],
	exports: [PurchaseItemsComponent],
})
export class PurchaseItemsComponentPageModule {}
