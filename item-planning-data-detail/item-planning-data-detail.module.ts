import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ItemPlanningDataDetailPage } from './item-planning-data-detail.page';
import { ShareModule } from 'src/app/share.module';
import { InputControlComponent } from 'src/app/components/controls/input-control.component';
import { ShareInputControlsModule } from 'src/app/components/controls/share-input-controls.modules';

const routes: Routes = [
	{
		path: '',
		component: ItemPlanningDataDetailPage,
	},
];

@NgModule({
	imports: [CommonModule, FormsModule, ShareModule,IonicModule, ReactiveFormsModule, RouterModule.forChild(routes)],
	declarations: [ItemPlanningDataDetailPage],
})
export class ItemPlanningDataDetailPageModule {}
