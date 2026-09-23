import { PurchaseOrderPage } from './purchase-order.page';

describe('PurchaseOrderPage', () => {
	let component: PurchaseOrderPage;

	beforeEach(() => {
		component = Object.create(PurchaseOrderPage.prototype) as PurchaseOrderPage;
		component.pageConfig = { listSyncFetchById: true } as any;
		component.statusList = [];
		component.items = [];
		component.env = { branchList: [{ Id: 3, Name: 'WH-A' }] } as any;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('enrichListItem maps status, warehouse and date texts for list rows', () => {
		component.statusList = [{ Code: 'New', Name: 'New', Color: 'warning' }];
		const row = component.enrichListItem({
			Id: 7,
			OrderDate: '2026-09-22T10:15:00',
			ExpectedReceiptDate: '2026-09-25T08:00:00',
			Status: 'New',
			TotalAfterTax: 1000,
			IDWarehouse: 3,
		});

		expect(row.OrderDateText).toBeTruthy();
		expect(row.ExpectedReceiptDateText).toBeTruthy();
		expect(row.StatusText).toBe('New');
		expect(row.StatusColor).toBe('warning');
		expect(row.WarehouseName).toBe('WH-A');
		expect(row.TotalAfterTaxText).toBeTruthy();
	});
});
