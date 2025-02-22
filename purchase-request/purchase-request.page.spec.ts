import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PurchaseRequestPage } from './purchase-request.page';

describe('PurchaseRequestPage', () => {
	let component: PurchaseRequestPage;
	let fixture: ComponentFixture<PurchaseRequestPage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PurchaseRequestPage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(PurchaseRequestPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
