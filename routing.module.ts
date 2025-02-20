import { Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guards/app.guard';

export const PURCHASERoutes: Routes = [
    
    { path: 'purchase-request', loadChildren: () => import('./purchase-request/purchase-request.module').then(m => m.PurchaseRequestPageModule), canActivate: [AuthGuard] },
    { path: 'purchase-request/:id', loadChildren: () => import('./purchase-request-detail/purchase-request-detail.module').then(m => m.PurchaseRequestDetailPageModule), canActivate: [AuthGuard] },
    { path: 'purchase-quotation', loadChildren: () => import('./purchase-quotation/purchase-quotation.module').then(m => m.PurchaseQuotationPageModule), canActivate: [AuthGuard] },
    { path: 'purchase-quotation/:id', loadChildren: () => import('./purchase-quotation-detail/purchase-quotation-detail.module').then(m => m.PurchaseQuotationDetailPageModule), canActivate: [AuthGuard] },
    { path: 'purchase-order', loadChildren: () => import('./purchase-order/purchase-order.module').then(m => m.PurchaseOrderPageModule), canActivate: [AuthGuard] },
    { path: 'purchase-order/:id', loadChildren: () => import('./purchase-order-detail/purchase-order-detail.module').then(m => m.PurchaseOrderDetailPageModule), canActivate: [AuthGuard] },
    { path: 'purchase-order-note', loadChildren: () => import('./purchase-order-note/purchase-order-note.module').then(m => m.PurchaseOrderNotePageModule), canActivate: [AuthGuard] },
    { path: 'purchase-order-note/:id', loadChildren: () => import('./purchase-order-note/purchase-order-note.module').then(m => m.PurchaseOrderNotePageModule), canActivate: [AuthGuard] },
  
];
``