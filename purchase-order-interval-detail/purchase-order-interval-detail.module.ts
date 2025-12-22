import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ShareModule } from 'src/app/share.module';
import { PurchaseOrderIntervalDetailPage } from './purchase-order-interval-detail.page';

const routes: Routes = [
    {
        path: '',
        component: PurchaseOrderIntervalDetailPage,
    },
];

@NgModule({
    imports: [CommonModule, FormsModule, IonicModule, ReactiveFormsModule, ShareModule, RouterModule.forChild(routes)],
    declarations: [PurchaseOrderIntervalDetailPage],
})
export class PurchaseOrderIntervalDetailPageModule {}
