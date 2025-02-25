import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { PURCHASE_RequestProvider } from 'src/app/services/static/services.service';



@Injectable({ providedIn: 'root' })
export class PURCHASE_RequestService extends PURCHASE_RequestProvider {
	showCommandRules = [
		{ Status: 'Draft', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Mới
		{ Status: 'Unapproved', ShowBtns: ['ShowChangeBranch', 'ShowSubmit', 'ShowApprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Không duyệt
		{ Status: 'Submitted', ShowBtns: ['ShowApprove', 'ShowDisapprove', 'ShowCancel', 'ShowDelete', 'ShowArchive'] }, // Chờ duyệt
		{ Status: 'Approved', ShowBtns: ['ShowDisapprove', 'ShowCancel', 'ShowArchive', 'ShowCopyToPurchaseQuotation'] }, // Đã duyệt

		{ Status: 'Open', ShowBtns: ['ShowArchive'] }, // Đang xử lý
		{ Status: 'Closed', ShowBtns: ['ShowArchive'] }, // Đã xong

		{ Status: 'Splitted', ShowBtns: ['ShowArchive'] }, // Đơn đã chia
		{ Status: 'Merged', ShowBtns: ['ShowArchive'] }, // Đơn đã gộp
	];


	
}