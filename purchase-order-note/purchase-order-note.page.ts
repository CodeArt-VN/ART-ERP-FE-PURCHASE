import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { PURCHASE_OrderProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode'
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-purchase-order-note',
    templateUrl: 'purchase-order-note.page.html',
    styleUrls: ['purchase-order-note.page.scss']
})
export class PurchaseOrderNotePage extends PageBase {
    constructor(
        public pageProvider: PURCHASE_OrderProvider,
        public modalController: ModalController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
        public route: ActivatedRoute,
    ) {
        super();
        this.pageConfig.isShowFeature = true;
        this.id = this.route.snapshot.paramMap.get('id');
        //let today = new Date;
        //this.query.OrderDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
        this.query.Status = 'PORequestApproved';
    }

    
    preLoadData(event?: any): void {
        Promise.all([
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', {Code: 'PONConvertToLargerUoM', IDBranch: this.env.selectedBranch}).toPromise(),
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', {Code: 'PONShowPackingUoM', IDBranch: this.env.selectedBranch}).toPromise(),
            this.pageProvider.commonService.connect('GET', 'SYS/Config/ConfigByBranch', {Code: 'PONShowEACaseOnly', IDBranch: this.env.selectedBranch}).toPromise(),
        ]).then((values: any) => {
            this.pageConfig.PONConvertToLargerUoM = JSON.parse(values[0]['Value']);
            this.pageConfig.PONShowPackingUoM = JSON.parse(values[1]['Value']);
            this.pageConfig.PONShowEACaseOnly = JSON.parse(values[2]['Value']);
            super.preLoadData(event);
        });
    }

    
    
    


    loadedData(event) {
        super.loadedData(event);
       
        this.items.forEach(i => {
            i.OrderDateText = lib.dateFormat(i.OrderDate, 'dd/mm/yy hh:MM');
            i.OrderTimeText = lib.dateFormat(i.OrderDate, 'hh:MM');
        });

        if (this.id) {
            this.loadPurchaseOrderNote({ Id: this.id });
        }
    }


    selectedPurchaseOrderID = 0;
    sheets: any[] = [];
    loadPurchaseOrderNote(i) {

        this.selectedPurchaseOrderID = i.Id;
        this.id = this.selectedPurchaseOrderID;

        let newURL = `#${this.pageConfig.pageName}/${this.id}`;// '#'+this.pageConfig.pageName + '/' + this.id;
        history.pushState({}, null, newURL);

        this.submitAttempt = true;

        this.loadingController.create({
            cssClass: 'my-custom-class',
            message: 'Đang tạo phiếu mua hàng...'
        }).then(loading => {
            loading.present();
            this.pageProvider.getAnItem(i.Id).then(resp => {
                this.sheets = [];
                this.sheets.push(resp);

                for (let si = 0; si < this.sheets.length; si++) {
                    const o = this.sheets[si];
                    o.OrderDateText = lib.dateFormat(o.OrderDate, 'dd/mm/yy hh:MM');
                    o.ExpectedReceiptDateText = lib.dateFormat(o.ExpectedReceiptDate, 'dd/mm/yy hh:MM');
                    o.StatusText = lib.getAttrib(o.Status, this.env.statusList, 'Name', 'NA', 'Code');

                    QRCode.toDataURL('PO:' + o.Id, { errorCorrectionLevel: 'H', version: 2, width: 500, scale: 20, type: 'image/webp' }, function (err, url) {
                        o.QRC = url;
                    })

                    o.OrderLines.sort((a, b) => (parseFloat(a.ItemSort) - parseFloat(b.ItemSort)) || a._Item.Code.localeCompare(b._Item.Code));
                    o.OrderLines.forEach(l => {
                        l.UoMPriceText = lib.formatMoney(l.UoMPrice, 0);
                        l.TotalBeforeDiscountText = lib.formatMoney(l.TotalBeforeDiscount, 0);
                        l.TotalDiscountText = lib.formatMoney(l.TotalDiscount, 0);
                        l.TotalAfterDiscountText = lib.formatMoney(l.TotalAfterDiscount, 0);
                        l.TotalAfterTaxText = lib.formatMoney(l.TotalAfterTax, 0);
                    });

                    o.TotalBeforeDiscountText = lib.formatMoney(o.TotalBeforeDiscount, 0);
                    o.TotalDiscountText = lib.formatMoney(o.TotalDiscount, 0);
                    o.TotalAfterDiscountText = lib.formatMoney(o.TotalAfterDiscount, 0);
                    o.TotalTaxText = lib.formatMoney(o.TotalTax, 0);
                    o.TotalAfterTaxText = lib.formatMoney(o.TotalAfterTax, 0);
                    // o.DocTienBangChu = this.DocTienBangChu(o.TotalAfterTax);
                };


                this.submitAttempt = false;
                if (loading) loading.dismiss();
                setTimeout(() => {
                    this.calcPageBreak();
                }, 100);

            }).catch(err => {
                console.log(err);
                if (err.message != null) {
                    this.env.showMessage(err.message, 'danger');
                }
                else {
                    this.env.showTranslateMessage('erp.app.pages.purchase.purchase-order.message.can-not-create-order', 'danger');
                }
                this.submitAttempt = false;
                if (loading) loading.dismiss();
            });

        });
    }





    printMode = 'A4';
    changePrintMode() {
        this.printMode = this.printMode == 'A4' ? 'A5' : 'A4';
        this.calcPageBreak();
    }

    calcPageBreak() {
        let sheets = document.querySelectorAll('.sheet');

        var e = document.createElement("div");
        e.style.position = "absolute";
        e.style.width = "147mm";
        document.body.appendChild(e);
        var rect = e.getBoundingClientRect();
        document.body.removeChild(e);
        let A5Height = rect.width;

        if (this.printMode == 'A5') {
            sheets.forEach((s: any) => {
                s.style.pageBreakAfter = 'always';
                s.style.borderBottom = 'none';
                s.style.minHeight = '147mm';

                if (s.clientHeight > A5Height * 6 + 20) {
                    s.style.minHeight = '1180mm';
                }
                else if (s.clientHeight > A5Height * 4 + 20) {
                    s.style.minHeight = '885mm';
                }
                else if (s.clientHeight > A5Height * 2 + 20) {
                    s.style.minHeight = '590mm';
                }
                else if (s.clientHeight > A5Height + 20) {
                    s.style.minHeight = '295mm';
                }
            });
        }
        else {
            sheets.forEach((s: any) => {
                s.style.breakAfter = 'unset';
                s.style.minHeight = '148mm';
                //s.style.borderBottom = 'dashed 1px #ccc';

                if (s.clientHeight > A5Height * 6 + 20) {
                    s.style.minHeight = '1180mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height * 4 + 20) {
                    s.style.minHeight = '885mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height * 2 + 20) {
                    s.style.minHeight = '590mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
                else if (s.clientHeight > A5Height + 20) {
                    s.style.minHeight = '295mm';
                    s.style.pageBreakBefore = 'always';
                    s.style.pageBreakAfter = 'always';
                }
            });
        }
    }

    DocSo3ChuSo(baso) {
        var ChuSo = new Array(" không ", " một ", " hai ", " ba ", " bốn ", " năm ", " sáu ", " bảy ", " tám ", " chín ");

        var tram;
        var chuc;
        var donvi;
        var KetQua = "";
        tram = parseInt((baso / 100) + '');
        chuc = parseInt(((baso % 100) / 10) + '');
        donvi = baso % 10;
        if (tram == 0 && chuc == 0 && donvi == 0) return "";
        if (tram != 0) {
            KetQua += ChuSo[tram] + " trăm ";
            if ((chuc == 0) && (donvi != 0)) KetQua += " linh ";
        }
        if ((chuc != 0) && (chuc != 1)) {
            KetQua += ChuSo[chuc] + " mươi";
            if ((chuc == 0) && (donvi != 0)) KetQua = KetQua + " linh ";
        }
        if (chuc == 1) KetQua += " mười ";
        switch (donvi) {
            case 1:
                if ((chuc != 0) && (chuc != 1)) {
                    KetQua += " mốt ";
                }
                else {
                    KetQua += ChuSo[donvi];
                }
                break;
            case 5:
                if (chuc == 0) {
                    KetQua += ChuSo[donvi];
                }
                else {
                    KetQua += " lăm ";
                }
                break;
            default:
                if (donvi != 0) {
                    KetQua += ChuSo[donvi];
                }
                break;
        }
        return KetQua;
    }

    DocTienBangChu(SoTien) {
        var Tien = new Array("", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ");

        var lan = 0;
        var i = 0;
        var so = 0;
        var KetQua = "";
        var tmp = "";
        var ViTri = new Array();
        if (SoTien < 0) return "Số tiền âm !";
        if (SoTien == 0) return "Không đồng !";
        if (SoTien > 0) {
            so = SoTien;
        }
        else {
            so = -SoTien;
        }
        if (SoTien > 8999999999999999) {
            //SoTien = 0;
            return "Số quá lớn!";
        }
        ViTri[5] = Math.floor(so / 1000000000000000);
        if (isNaN(ViTri[5]))
            ViTri[5] = "0";
        so = so - parseFloat(ViTri[5].toString()) * 1000000000000000;
        ViTri[4] = Math.floor(so / 1000000000000);
        if (isNaN(ViTri[4]))
            ViTri[4] = "0";
        so = so - parseFloat(ViTri[4].toString()) * 1000000000000;
        ViTri[3] = Math.floor(so / 1000000000);
        if (isNaN(ViTri[3]))
            ViTri[3] = "0";
        so = so - parseFloat(ViTri[3].toString()) * 1000000000;
        ViTri[2] = parseInt((so / 1000000) + '');
        if (isNaN(ViTri[2]))
            ViTri[2] = "0";
        ViTri[1] = parseInt(((so % 1000000) / 1000) + '');
        if (isNaN(ViTri[1]))
            ViTri[1] = "0";
        ViTri[0] = parseInt((so % 1000) + '');
        if (isNaN(ViTri[0]))
            ViTri[0] = "0";
        if (ViTri[5] > 0) {
            lan = 5;
        }
        else if (ViTri[4] > 0) {
            lan = 4;
        }
        else if (ViTri[3] > 0) {
            lan = 3;
        }
        else if (ViTri[2] > 0) {
            lan = 2;
        }
        else if (ViTri[1] > 0) {
            lan = 1;
        }
        else {
            lan = 0;
        }
        for (i = lan; i >= 0; i--) {
            tmp = this.DocSo3ChuSo(ViTri[i]);
            KetQua += tmp;
            if (ViTri[i] > 0) KetQua += Tien[i];
            if ((i > 0) && (tmp.length > 0)) KetQua += ',';//&& (!string.IsNullOrEmpty(tmp))
        }
        if (KetQua.substring(KetQua.length - 1) == ',') {
            KetQua = KetQua.substring(0, KetQua.length - 1);
        }
        KetQua = KetQua.substring(1, 2).toUpperCase() + KetQua.substring(2) + ' đồng';
        return KetQua;//.substring(0, 1);//.toUpperCase();// + KetQua.substring(1);
    }

    toggleDateFilter() {
        this.query.Status = this.query.Status == 'PORequestApproved' ? '' : 'PORequestApproved';
        if (this.query.Status == 'PORequestApproved') {
            this.query.OrderDate = '';
        }
        else {
            let today = new Date;
            this.query.OrderDate = lib.dateFormat(today.setDate(today.getDate()), 'yyyy-mm-dd');
        }

        this.refresh();
    }

}
