import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemPlanningDataPage } from './item-planning-data.page';
import { ShareModule } from 'src/app/share.module';

@NgModule({
	imports: [IonicModule, CommonModule, ShareModule, RouterModule.forChild([{ path: '', component: ItemPlanningDataPage }])],
	declarations: [ItemPlanningDataPage],
})
export class ItemPlanningDataPageModule {}
