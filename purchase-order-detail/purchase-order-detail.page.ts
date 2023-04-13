import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, CRM_ContactProvider, PURCHASE_OrderDetailProvider, PURCHASE_OrderProvider, SYS_ConfigProvider, SYS_StatusProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl, FormArray, FormGroup } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { SaleOrderPickerModalPage } from '../sale-order-picker-modal/sale-order-picker-modal.page';

@Component({
    selector: 'app-purchase-order-detail',
    templateUrl: './purchase-order-detail.page.html',
    styleUrls: ['./purchase-order-detail.page.scss'],
})
export class PurchaseOrderDetailPage extends PageBase {
    @ViewChild('importfile') importfile: any;
    branchList = [];
    vendorList = [];
    storerList = [];
    statusList = [];
    paymentStatusList = [];
    constructor(
        public pageProvider: PURCHASE_OrderProvider,
        public purchaseOrderDetailProvider: PURCHASE_OrderDetailProvider,
        public contactProvider: CRM_ContactProvider,
        public branchProvider: BRA_BranchProvider,
        public itemProvider: WMS_ItemProvider,
        public statusProvider: SYS_StatusProvider,
        public env: EnvService,
        public navCtrl: NavController,
        public route: ActivatedRoute,
        public modalController: ModalController,
        public alertCtrl: AlertController,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public loadingController: LoadingController,
        public commonService: CommonService,
    ) {
        super();
        this.pageConfig.isDetailPage = true;

        this.formGroup = formBuilder.group({
            IDBranch: ['', Validators.required],
            IDStorer: ['', Validators.required],
            IDVendor: ['', Validators.required],
            Id: new FormControl({ value: '', disabled: true }),
            Code: [''],
            Name: [''],
            // ForeignName: [''],
            Remark: [''],
            // ForeignRemark: [''],
            OrderDate: new FormControl({ value: '', disabled: true }),
            ExpectedReceiptDate: [''],
            ReceiptedDate: new FormControl({ value: '', disabled: true }),
            Type : ['Regular'],
            Status: new FormControl({ value: 'Draft', disabled: true }),
            PaymentStatus: ['WaitForPay', Validators.required],
            IsDisabled: [''],
            OrderLines: this.formBuilder.array([]),
            TotalAfterTax: new FormControl({ value: '', disabled: true })
        });

        Object.assign(pageProvider, {
            importDetail(fileToUpload: File, id) {
                const formData: FormData = new FormData();
                formData.append('fileKey', fileToUpload, fileToUpload.name);
                return new Promise((resolve, reject) => {
                    this.commonService.connect('UPLOAD', ApiSetting.apiDomain("PURCHASE/Order/ImportDetailFile/" + id), formData).toPromise()
                        .then((data) => {
                            resolve(data);
                        }).catch(err => {
                            reject(err);
                        })
                });
            },
            copyToReceipt(item) {
                return new Promise((resolve, reject) => {
                    this.commonService.connect('POST', ApiSetting.apiDomain("PURCHASE/Order/CopyToReceipt/"), item).toPromise()
                        .then((data) => {
                            resolve(data);
                        }).catch(err => {
                            reject(err);
                        })
                });
            }
        });
    }

    preLoadData(event) {
        this.branchProvider.read({ Skip: 0, Take: 5000, IDType: 115, AllParent: true, Id: this.env.selectedBranchAndChildren }).then(resp => {
            lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
                this.branchList = result;
                this.branchList.forEach(i => {
                    i.disabled = true;
                });
                this.markNestedNode(this.branchList, this.env.selectedBranch);
                super.preLoadData(event);
            });
        });
        this.contactProvider.read({ IsVendor: true, Take: 5000 }).then((resp) => {
            this.vendorList = resp['data'];
        });
        this.contactProvider.read({ IsStorer: true, Take: 5000 }).then((resp) => {
            this.storerList = resp['data'];
        });
        
        this.env.getStatus('PurchaseOrder').then((data:any)=>{
            this.statusList = data;
        });
        this.env.getStatus('POPaymentStatus').then((data:any)=>{
            this.paymentStatusList = data;
        });

        Promise.all([
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', {Code: 'POShowSuggestedQuantity', IDBranch: this.env.selectedBranch}).toPromise(),
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', {Code: 'POShowAdjustedQuantity', IDBranch: this.env.selectedBranch}).toPromise(),
        ]).then((values: any) => {
            this.pageConfig.POShowSuggestedQuantity = JSON.parse(values[0]['Value']);
            this.pageConfig.POShowAdjustedQuantity = JSON.parse(values[1]['Value']);
            
        });

        
    }

    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            if (i.IDType == 115)
                i.disabled = false;
            this.markNestedNode(ls, i.Id);
        });
    }

    loadedData() {
        if (this.item) {
            this.item.OrderDateText = lib.dateFormat(this.item.OrderDate, 'hh:MM dd/mm/yyyy');
            if (this.item.OrderLines)
                this.item.OrderLines.sort((a, b) => (a.Id > b.Id) ? 1 : ((b.Id > a.Id) ? -1 : 0));

            if (!(this.item.Status == 'Draft' || this.item.Status == 'PORequestUnapproved')) {
                this.pageConfig.canEdit = false;
            }

            if ((this.item.Status == 'PORequestApproved' || this.item.Status == 'Submitted') && this.pageConfig.canEditApprovedOrder) {
                this.pageConfig.canEdit = true;
            }

        }

        super.loadedData();
        this.setOrderLines();
    }

    setOrderLines() {
        this.formGroup.controls.OrderLines = new FormArray([]);
        if (this.item.OrderLines?.length)
            this.item.OrderLines.forEach(i => {
                this.addOrderLine(i);
            })
        // else
        //     this.addOrderLine({ IDOrder: this.item.Id, Id: 0 });

        this.calcTotalLine();
    }

    addOrderLine(line) {
        let searchInput$ = new Subject<string>();
        let groups = <FormArray>this.formGroup.controls.OrderLines;
        let group = this.formBuilder.group({
            _ItemSearchLoading: [false],
            _ItemSearchInput: [searchInput$],
            _ItemDataSource: [searchInput$.pipe(distinctUntilChanged(),
                tap(() => group.controls._ItemSearchLoading.setValue(true)),
                switchMap(term => this.itemProvider.search({ Take: 20, Skip: 0, Keyword: term, IDPO: this.item.Id })
                    .pipe(catchError(() => of([])), tap(() => group.controls._ItemSearchLoading.setValue(false))))
            )],
            _UoMs: [line._Item ? line._Item.UoMs : ''],
            _Item: [line._Item, Validators.required],
            IDOrder: [line.IDOrder],
            Id: [line.Id],
            // Code: [line.Code],
            // Remark: [line.Remark],
            // ForeignRemark: [line.ForeignRemark],
            IDItem: [line.IDItem, Validators.required],
            IDUoM: [line.IDUoM, Validators.required],
            UoMPrice: [line.UoMPrice],
            SuggestedQuantity: new FormControl({ value: line.SuggestedQuantity, disabled: true }),
            UoMQuantityExpected: [line.UoMQuantityExpected, Validators.required],
            QuantityAdjusted: [line.QuantityAdjusted],
            IsPromotionItem: [line.IsPromotionItem],
            TotalBeforeDiscount: new FormControl({ value: line.TotalBeforeDiscount, disabled: true }),
            TotalDiscount: [line.TotalDiscount],
            TotalAfterDiscount: new FormControl({ value: line.TotalAfterDiscount, disabled: true }),
            TaxRate: [line.TaxRate],
            Tax: [line.Tax],
            TotalAfterTax: new FormControl({ value: line.TotalAfterTax, disabled: true }),
        });
        groups.push(group);
    }

    removeOrderLine(index) {
        this.alertCtrl.create({
            header: 'Xóa sản phẩm',
            //subHeader: '---',
            message: 'Bạn chắc muốn xóa sản phẩm?',
            buttons: [
                {
                    text: 'Không',
                    role: 'cancel',
                },
                {
                    text: 'Đồng ý xóa',
                    cssClass: 'danger-btn',
                    handler: () => {
                        let groups = <FormArray>this.formGroup.controls.OrderLines;
                        let Ids = [];
                        Ids.push({ Id: groups.controls[index]['controls'].Id.value });
                        this.purchaseOrderDetailProvider.delete(Ids).then(resp => {
                            groups.removeAt(index);
                            this.calcTotalLine();
                            this.env.publishEvent({ Code: this.pageConfig.pageName });
                            this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.delete-complete','success');
                        });
                    }
                }
            ]
        }).then(alert => {
            alert.present();
        })


    }

    saveOrder() {
        this.calcTotalLine();
        //if (this.formGroup.controls.OrderLines.valid)
        super.saveChange2();
    }

    calcTotalLine() {
        console.log(this.formGroup.controls.OrderLines);
        
        this.item.TotalBeforeDiscount = this.formGroup.controls.OrderLines.value.map(x => x.UoMPrice * (x.UoMQuantityExpected + x.QuantityAdjusted)).reduce((a, b) => (+a) + (+b), 0);
        this.item.TotalDiscount = this.formGroup.controls.OrderLines.value.map(x => x.TotalDiscount).reduce((a, b) => (+a) + (+b), 0);
        this.item.TotalAfterDiscount = this.item.TotalBeforeDiscount - this.item.TotalDiscount;
        this.item.Tax = this.formGroup.controls.OrderLines.value.map(x => x.UoMPrice * (x.UoMQuantityExpected + x.QuantityAdjusted) * (x.TaxRate / 100)).reduce((a, b) => (+a) + (+b), 0);
        this.item.TotalAfterTax = this.item.TotalAfterDiscount + this.item.Tax;
    }

    savedChange(savedItem = null, form = this.formGroup) {
        super.savedChange(savedItem, form);
        this.item = savedItem;
        this.loadedData();
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    changedIDItem(group, e) {
        if (e) {

            group.controls._UoMs.setValue(e.UoMs);
            group.controls.IDItem.setValue(e.Id);
            group.controls.IDItem.markAsDirty();
            group.controls.IDUoM.setValue(e.PurchasingUoM);
            group.controls.IDUoM.markAsDirty();

            this.changedIDUoM(group);
        }
    }

    changedIDUoM(group) {
        let selectedUoM = group.controls._UoMs.value.find(d => d.Id == group.controls.IDUoM.value);

        if (selectedUoM) {
            let price = selectedUoM.PriceList.find(d => d.Type == 'PriceListForVendor');
            if (price) {
                group.controls.UoMPrice.setValue(price.Price);
                group.controls.UoMPrice.markAsDirty();
                this.saveOrder();
            }
        }
    }

    importClick() {
        this.importfile.nativeElement.value = "";
        this.importfile.nativeElement.click();
    }
    async uploadOrderLine(event) {
        if (event.target.files.length == 0)
            return;

        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Vui lòng chờ import dữ liệu'
        });
        await loading.present().then(() => {
            this.pageProvider['importDetail'](event.target.files[0], this.id)
                .then((resp: any) => {
                    this.refresh();
                    if (loading) loading.dismiss();

                    if (resp.ErrorList && resp.ErrorList.length) {
                        let message = '';
                        for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
                            if (i == 5) message += '<br> Còn nữa...';
                            else {
                                const e = resp.ErrorList[i];
                                message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
                            }

                        this.alertCtrl.create({
                            header: 'Có lỗi import dữ liệu',
                            subHeader: 'Bạn có muốn xem lại các mục bị lỗi?',
                            message: 'Có ' + resp.ErrorList.length + ' lỗi khi import:' + message,
                            cssClass: 'alert-text-left',
                            buttons: [
                                { text: 'Không', role: 'cancel', handler: () => { } },
                                {
                                    text: 'Có', cssClass: 'success-btn', handler: () => {
                                        this.downloadURLContent(ApiSetting.mainService.base + resp.FileUrl);
                                    }
                                }
                            ]
                        }).then(alert => {
                            alert.present();
                        })
                    }
                    else {
                        this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.import-complete','success');
                        this.env.publishEvent({ Code: this.pageConfig.pageName });
                    }
                })
                .catch(err => {
                    if (err.statusText == "Conflict") {
                        this.downloadURLContent(ApiSetting.mainService.base + err._body);
                    }
                    if (loading) loading.dismiss();
                })
        })
    }

    async copyToReceipt() {
        const loading = await this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Vui lòng chờ import dữ liệu'
        });
        await loading.present().then(() => {
            this.pageProvider['copyToReceipt'](this.item)
                .then((resp: any) => {

                    if (loading) loading.dismiss();
                    this.alertCtrl.create({
                        header: 'Đã tạo ASN/Receipt',

                        message: 'Bạn có muốn di chuyển đến ASN mới tạo?',
                        cssClass: 'alert-text-left',
                        buttons: [
                            { text: 'Không', role: 'cancel', handler: () => { } },
                            {
                                text: 'Có', cssClass: 'success-btn', handler: () => {
                                    this.nav('/receipt/' + resp);
                                }
                            }
                        ]
                    }).then(alert => {
                        alert.present();
                    })
                    this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.create-asn-complete','success');
                    this.env.publishEvent({ Code: this.pageConfig.pageName });

                })
                .catch(err => {
                    console.log(err);

                    this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.can-not-create-asn','danger');
                    if (loading) loading.dismiss();
                })
        })
    }

    async createInvoice(){
        this.env.showLoading('Vui lòng chờ tạo hóa đơn',
        this.pageProvider.commonService.connect('POST', 'PURCHASE/Order/CreateInvoice/', {Ids:[this.item.Id]}).toPromise()
        ).then((resp:any)=>{
            this.env.showPrompt("Bạn có muốn mở hóa đơn vừa tạo?").then(_=>{
                if (resp.length == 1) {
                    this.nav('/ap-invoice/' + resp[0]);
                }
                else{
                    this.nav('/ap-invoice/');
                }
            }).catch(_=>{});
        }).catch(err=>{
            this.env.showMessage(err)
        });
    }

    async showSaleOrderPickerModal() {
        const modal = await this.modalController.create({
            component: SaleOrderPickerModalPage,
            componentProps: {
                id: this.item.Id
            },
            cssClass: 'modal90'
        });

        await modal.present();
        const { data } = await modal.onWillDismiss();

        if (data && data.length) {
            console.log(data);
            console.log(data.map(i => i.Id));

            const loading = await this.loadingController.create({
                cssClass: 'my-custom-class',
                message: 'Vui lòng chờ import dữ liệu'
            });
            await loading.present().then(() => {
                let postData = {
                    Id: this.item.Id,
                    SOIds: data.map(i => i.Id)
                };
                this.commonService.connect('POST', ApiSetting.apiDomain("PURCHASE/Order/ImportDetailFromSaleOrders/"), postData).toPromise()
                    .then((data) => {
                        if (loading) loading.dismiss();
                        this.refresh();
                        this.env.publishEvent({ Code: this.pageConfig.pageName });
                    }).catch(err => {
                        console.log(err);
                        this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.can-not-add','danger');
                        if (loading) loading.dismiss();
                    })
            })
        }
    }
}
