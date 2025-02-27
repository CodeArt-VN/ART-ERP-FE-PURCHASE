import { Location } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { AlertController, LoadingController, ModalController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { PURCHASE_RequestProvider, SYS_ConfigProvider } from 'src/app/services/static/services.service';
import { PURCHASE_RequestService } from '../purchase-request.service';
import { PurchaseQuotationModalPage } from '../purchase-request-detail/purchase-quotation-modal/purchase-quotation-modal.page';
import { PurchaseOrderModalPage } from '../purchase-request-detail/purchase-order-modal/purchase-order-modal.page';

@Component({
	selector: 'app-purchase-request',
	templateUrl: 'purchase-request.page.html',
	styleUrls: ['purchase-request.page.scss'],
	standalone: false,
})
export class PurchaseRequestPage extends PageBase {
	statusList = [];

	constructor(
		public pageProvider: PURCHASE_RequestService,
		public sysConfigProvider: SYS_ConfigProvider,
		public modalController: ModalController,
		public popoverCtrl: PopoverController,
		public alertCtrl: AlertController,
		public loadingController: LoadingController,
		public env: EnvService,
		public navCtrl: NavController,
		public location: Location
	) {
		super();
	}

	preLoadData(event) {
		if (!this.sort.Id) {
			this.sort.Id = 'Id';
			this.sortToggle('Id', true);
		}
		let sysConfigQuery = ['PRUsedApprovalModule'];
		Promise.all([this.env.getStatus('PurchaseRequest'), this.sysConfigProvider.read({ Code_in: sysConfigQuery, IDBranch: this.env.selectedBranch })]).then((values) => {
			this.statusList = values[0];
			values[1]['data'].forEach((e) => {
				if ((e.Value == null || e.Value == 'null') && e._InheritedConfig) {
					e.Value = e._InheritedConfig.Value;
				}
				this.pageConfig[e.Code] = JSON.parse(e.Value);
			});
			super.preLoadData(event);
		});
	}

	loadedData(event) {
		this.items.forEach((i) => {
			i._Status = this.statusList.find((d) => d.Code == i.Status);
			i._requestBranchName = this.env.branchList.find((d) => d.Id == i.IDRequestBranch)?.Name;
			i._requesterName = i._Requester?.FullName;
		});
		super.loadedData(event);
		if (this.pageConfig['PRUsedApprovalModule']) {
			this.pageConfig['canApprove'] = false;
		}
	}

	sendRequestQuotationToVendor() {
		this.pageProvider
			.getAnItem(this.selectedItems[0].Id)
			.then((rs: any) => {
				if (rs) {
					let orderLines = rs.OrderLines.filter((d) => d.Id);
					orderLines.forEach((d) => (d._Vendors = d._Item._Vendors));
					this.pageProvider
						.sendRequestQuotationToVendor(rs.Id, orderLines, rs.IDVendor, PurchaseQuotationModalPage, this.modalController, this.env)
						.then((rs) => {
							if (rs) {
								this.env.showMessage('Purchase quotations created!', 'success');
								this.refresh();
								this.env.publishEvent({
									Code: this.pageConfig.pageName,
								});
							}
						})
						.catch((err) => {
							console.log(err);
							this.env.showMessage('Cannot create PQ, please try again later', 'danger');
						});
				}
			})
			.catch((err) => {
				console.log(err);
				this.env.showMessage(err, 'danger');
			});
	}

	copyToPO() {
		this.pageProvider
			.getAnItem(this.selectedItems[0].Id)
			.then((rs: any) => {
				if (rs) {
					let orderLines = rs.OrderLines.filter((d) => d.Id);
					let vendorList = [];
					orderLines.forEach((o) => {
						o._Vendors = o._Item._Vendors;	
						if (o.IDVendor) {
							vendorList = [...vendorList, ...o._Vendors.filter((v) => v.Id == o.IDVendor && !vendorList.some((vd) => v.Id == vd.Id))];
						} else {
							vendorList = [...vendorList, ...o._Vendors.filter((v) => !vendorList.some((vd) => v.Id == vd.Id))];
						}
					});
					this.pageProvider.copyToPO(rs.Id, orderLines, rs._Vendor, vendorList, PurchaseOrderModalPage, this.modalController, this.env).then((rs:any) => {
						if (rs) {
							this.env.showPrompt('Create purchase order successfully!', 'Do you want to navigate to purchase order?').then((d) => {
								this.nav('/purchase-order/' + rs.Id, 'forward');
							});
							this.refresh();
							this.env.publishEvent({ Code: this.pageConfig.pageName });
				
						}
					}).catch(err=>{
						this.env.showMessage('Cannot create PO, please try again later', 'danger');
					});
				} else {
					this.env.showMessage('Cannot get item!', 'danger');
				}
			})
			.catch((err) => {
				this.env.showMessage(err, 'danger');
			});
	}
	isOpenCopyPopover = false;
	@ViewChild('copyPopover') copyPopover!: HTMLIonPopoverElement;
	presentCopyPopover(e) {
		this.copyPopover.event = e;
		this.isOpenCopyPopover = !this.isOpenCopyPopover;
	}
}
