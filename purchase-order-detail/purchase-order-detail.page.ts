import { Component, ChangeDetectorRef, ViewChild } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, CRM_ContactProvider, PURCHASE_OrderDetailProvider, PURCHASE_OrderProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
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

        this.formGroup = this.formBuilder.group({
            IDBranch: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
            IDStorer: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
            IDVendor: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }, Validators.required),
            Id: new FormControl({ value: '', disabled: true }),
            Code: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
            Name: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
            // ForeignName: [''],
            Remark: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
            // ForeignRemark: [''],
            OrderDate: new FormControl({ value: '', disabled: true }),
            ExpectedReceiptDate: new FormControl({ value: '', disabled: !this.pageConfig.canEdit }),
            ReceiptedDate: new FormControl({ value: '', disabled: true }),
            Type: ['Regular'],
            Status: new FormControl({ value: 'Draft', disabled: true }),
            PaymentStatus: ['WaitForPay', Validators.required],
            IsDisabled: [''],
            OrderLines: this.formBuilder.array([]),
            TotalDiscount: new FormControl({ value: '', disabled: true }),
            TotalAfterTax: new FormControl({ value: '', disabled: true })
        });


        this.branchProvider.read({ Skip: 0, Take: 5000, Type: 'Warehouse', AllParent: true, Id: this.env.selectedBranchAndChildren }).then(resp => {
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

        this.env.getStatus('PurchaseOrder').then((data: any) => {
            this.statusList = data;
        });
        this.env.getStatus('POPaymentStatus').then((data: any) => {
            this.paymentStatusList = data;
        });

        Promise.all([
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', { Code: 'POShowSuggestedQuantity', IDBranch: this.env.selectedBranch }).toPromise(),
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', { Code: 'POShowAdjustedQuantity', IDBranch: this.env.selectedBranch }).toPromise(),
        ]).then((values: any) => {
            this.pageConfig.POShowSuggestedQuantity = JSON.parse(values[0]['Value']);
            this.pageConfig.POShowAdjustedQuantity = JSON.parse(values[1]['Value']);

        });


    }

    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            if (i.Type == 'Warehouse')
                i.disabled = false;
            this.markNestedNode(ls, i.Id);
        });
    }

    loadedData(event) {
        if (this.item) {
            this.item.OrderDateText = lib.dateFormat(this.item.OrderDate, 'hh:MM dd/mm/yyyy');
            if (this.item.OrderLines)
                this.item.OrderLines.sort((a, b) => (a.Id > b.Id) ? 1 : ((b.Id > a.Id) ? -1 : 0));

            if (!(this.item.Status == 'Draft' || this.item.Status == 'PORequestUnapproved')) {
                this.pageConfig.canEdit = false;
            }


        }

        super.loadedData(event, true);
        this.setOrderLines();
    }

    setOrderLines() {
        this.formGroup.controls.OrderLines = new FormArray([]);
        if (this.item.OrderLines?.length)
            this.item.OrderLines.forEach(i => {
                this.addLine(i);
            })
        // else
        //     this.addOrderLine({ IDOrder: this.item.Id, Id: 0 });
    }

    addLine(line, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.OrderLines;
        let preLoadItems = this.item._Items;
        let selectedItem = preLoadItems.find(d => d.Id == line.IDItem);

        let group = this.formBuilder.group({
            _IDItemDataSource: [{
                searchProvider: this.itemProvider,
                loading: false,
                input$: new Subject<string>(),
                selected: preLoadItems,
                items$: null,
                initSearch() {
                    this.loading = false;
                    this.items$ = concat(
                        of(this.selected),
                        this.input$.pipe(
                            distinctUntilChanged(),
                            tap(() => this.loading = true),
                            switchMap(term => this.searchProvider.search({ ARSearch: true, IDPO: line.IDOrder, SortBy: ['Id_desc'], Take: 20, Skip: 0, Term: term }).pipe(
                                catchError(() => of([])), // empty list on error
                                tap(() => this.loading = false)
                            ))
                        )
                    );
                }
            }],
            _IDUoMDataSource: [selectedItem ? selectedItem.UoMs : ''],

            IDOrder: [line.IDOrder],
            Id: [line.Id],
            Remark: new FormControl({ value: line.Remark, disabled: !(this.pageConfig.canEdit || ((this.item.Status == 'PORequestApproved' || this.item.Status == 'Submitted') && this.pageConfig.canEditApprovedOrder)) }),
            IDItem: [line.IDItem, Validators.required],
            IDUoM: new FormControl({ value: line.IDUoM, disabled: !this.pageConfig.canEdit }, Validators.required),
            UoMPrice: new FormControl({ value: line.UoMPrice, disabled: !(this.pageConfig.canEdit && this.pageConfig.canEditPrice) }, Validators.required),
            SuggestedQuantity: new FormControl({ value: line.SuggestedQuantity, disabled: true }),
            UoMQuantityExpected: new FormControl({ value: line.UoMQuantityExpected, disabled: !this.pageConfig.canEdit }, Validators.required),
            QuantityAdjusted: new FormControl({ value: line.QuantityAdjusted, disabled: !((this.item.Status == 'PORequestApproved' || this.item.Status == 'Submitted') && this.pageConfig.canEditApprovedOrder) }),
            IsPromotionItem: new FormControl({ value: line.IsPromotionItem, disabled: !this.pageConfig.canEdit }),
            TotalBeforeDiscount: new FormControl({ value: line.TotalBeforeDiscount, disabled: true }),
            TotalDiscount: new FormControl({ value: line.TotalDiscount, disabled: !this.pageConfig.canEdit }),
            TotalAfterDiscount: new FormControl({ value: line.TotalAfterDiscount, disabled: true }),
            TaxRate: new FormControl({ value: line.TaxRate, disabled: true }),
            Tax: new FormControl({ value: line.Tax, disabled: true }),
            TotalAfterTax: new FormControl({ value: line.TotalAfterTax, disabled: true }),
        });
        groups.push(group);

        group.get('_IDItemDataSource').value?.initSearch();

        if (markAsDirty) {
            group.get('IDOrder').markAsDirty();
        }
    }

    addNewLine() {
        let newLine: any = {
            IDOrder: this.item.Id,
            Id: 0
        };
        this.addLine(newLine, true);
    }

    removeLine(index) {
        this.env.showPrompt('Bạn chắc muốn xóa sản phẩm?', null, 'Xóa sản phẩm').then(_ => {
            let groups = <FormArray>this.formGroup.controls.OrderLines;
            let Ids = [];
            Ids.push({ Id: groups.controls[index]['controls'].Id.value });
            this.purchaseOrderDetailProvider.delete(Ids).then(resp => {
                groups.removeAt(index);
                this.env.publishEvent({ Code: this.pageConfig.pageName });
                this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.delete-complete', 'success');
            });
        }).catch(_ => { });
    }

    saveOrder() {
        this.debounce(() => { super.saveChange2() }, 300);
    }

    calcTotalDiscount() {
        return this.formGroup.controls.OrderLines.getRawValue().map(x => x.TotalDiscount).reduce((a, b) => (+a) + (+b), 0)
    }
    calcTotalAfterTax() {
        return this.formGroup.controls.OrderLines.getRawValue().map(x => (x.UoMPrice * (x.UoMQuantityExpected + x.QuantityAdjusted) - x.TotalDiscount) * (1 + x.TaxRate / 100)).reduce((a, b) => (+a) + (+b), 0);
    }

    savedChange(savedItem = null, form = this.formGroup) {
        super.savedChange(savedItem, form);
        this.item = savedItem;
        this.loadedData(null);
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    IDItemChange(e, group) {
        if (e) {
            if (e.PurchaseTaxInPercent && e.PurchaseTaxInPercent != -99) {
                group.controls._IDUoMDataSource.setValue(e.UoMs);

                group.controls.IDUoM.setValue(e.PurchasingUoM);
                group.controls.IDUoM.markAsDirty();

                group.controls.TaxRate.setValue(e.PurchaseTaxInPercent);
                group.controls.TaxRate.markAsDirty();

                this.IDUoMChange(group);
                return;
            }

            if (e.PurchaseTaxInPercent != -99)
                this.env.showTranslateMessage('The item has not been set tax');
        }


        group.controls.TaxRate.setValue(null);
        group.controls.TaxRate.markAsDirty();

        group.controls.IDUoM.setValue(null);
        group.controls.IDUoM.markAsDirty();

        group.controls.UoMPrice.setValue(null);
        group.controls.UoMPrice.markAsDirty();
    }

    IDUoMChange(group) {
        let idUoM = group.controls.IDUoM.value;

        if (idUoM) {
            let UoMs = group.controls._IDUoMDataSource.value;
            let u = UoMs.find(d => d.Id == idUoM);
            if (u && u.PriceList) {
                let p = u.PriceList.find(d => d.Type == 'PriceListForVendor');
                let taxRate = group.controls.TaxRate.value;
                if (p && taxRate != null) {
                    let priceBeforeTax = null;

                    if (taxRate < 0)
                        taxRate = 0; //(-1 || -2) In case goods are not taxed

                    if (p.IsTaxIncluded) {
                        priceBeforeTax = p.Price / (1 + taxRate / 100);
                    }
                    else {
                        priceBeforeTax = p.Price;
                    }

                    group.controls.UoMPrice.setValue(priceBeforeTax);
                    group.controls.UoMPrice.markAsDirty();

                    this.saveOrder();
                    return;
                }
            }
        }
        group.controls.UoMPrice.setValue(null);
        group.controls.UoMPrice.markAsDirty();
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
                        this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.import-complete', 'success');
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
                    this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.create-asn-complete', 'success');
                    this.env.publishEvent({ Code: this.pageConfig.pageName });

                })
                .catch(err => {
                    console.log(err);

                    this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.can-not-create-asn', 'danger');
                    if (loading) loading.dismiss();
                })
        })
    }

    async createInvoice() {
        this.env.showLoading('Vui lòng chờ tạo hóa đơn',
            this.pageProvider.commonService.connect('POST', 'PURCHASE/Order/CreateInvoice/', { Ids: [this.item.Id] }).toPromise()
        ).then((resp: any) => {
            this.env.showPrompt("Bạn có muốn mở hóa đơn vừa tạo?").then(_ => {
                if (resp.length == 1) {
                    this.nav('/ap-invoice/' + resp[0]);
                }
                else {
                    this.nav('/ap-invoice/');
                }
            }).catch(_ => { });
        }).catch(err => {
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
                        this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.can-not-add', 'danger');
                        if (loading) loading.dismiss();
                    })
            })
        }
    }
}
