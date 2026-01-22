import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseOrderMergeModalPage } from './purchase-order-merge-modal.page';

describe('PurchaseOrderMergeModalPage', () => {
	let component: PurchaseOrderMergeModalPage;
	let fixture: ComponentFixture<PurchaseOrderMergeModalPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PurchaseOrderMergeModalPage],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(PurchaseOrderMergeModalPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
