/**
 * Export Utility functions for exporting tables to CSV, Excel, Print, and A4 Bank Statement PDF
 */

export function exportToCsv(filename: string, rows: Record<string, any>[]): void {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvLines: string[] = [];

  // Add UTF-8 BOM for Arabic support in Excel
  csvLines.push('\uFEFF' + headers.join(','));

  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvLines.push(values.join(','));
  }

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPrint(title: string, elementId: string): void {
  const content = document.getElementById(elementId);
  if (!content) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; direction: rtl; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 10px; text-align: right; }
          th { background-color: #f2f2f2; font-weight: bold; }
          h2 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        ${content.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export interface BankStatementParams {
  vendorName: string;
  vendorPhone?: string;
  accountNumber: string;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  closingBalance: number;
  entries: {
    date: string;
    ref_no: string;
    description: string;
    debit: number;
    credit: number;
    running_balance: number;
    currency: string;
    status: string;
  }[];
}

export function exportToBankStatementPdf(params: BankStatementParams): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const todayStr = new Date().toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowsHtml = params.entries.map((item, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${item.date}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #1e293b; font-size: 11px;">${item.ref_no}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600;">${item.description}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #dc2626; font-family: monospace; font-weight: bold; text-align: left;">${item.debit > 0 ? '-' + item.debit.toLocaleString() : '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #16a34a; font-family: monospace; font-weight: bold; text-align: left;">${item.credit > 0 ? '+' + item.credit.toLocaleString() : '-'}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #0284c7; text-align: left; background-color: #f0f9ff;">${item.running_balance.toLocaleString()} ${item.currency}</td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-align: center;">${item.status}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>كشف حساب مالي - ${params.vendorName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; direction: rtl; margin: 0; padding: 0; background: #fff; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 3px solid #0284c7; padding-bottom: 15px; }
          .logo { font-size: 22px; font-weight: 900; color: #0284c7; }
          .sub-logo { font-size: 12px; color: #64748b; margin-top: 4px; }
          .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 20px; }
          .summary-grid { display: flex; justify-content: space-between; align-items: center; text-align: center; }
          .summary-item { flex: 1; padding: 0 10px; }
          .summary-item:not(:last-child) { border-left: 1px solid #cbd5e1; }
          .summary-title { font-size: 11px; color: #64748b; font-weight: bold; margin-bottom: 5px; }
          .summary-value { font-size: 15px; font-weight: 800; font-family: monospace; }
          .main-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .main-table th { background: #0f172a; color: #ffffff; padding: 10px; font-size: 11px; text-align: right; border: 1px solid #0f172a; }
          .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b; }
          .signature-box { border: 2px dashed #0284c7; padding: 8px 20px; border-radius: 8px; font-weight: bold; color: #0284c7; }
        </style>
      </head>
      <body>
        <!-- Header -->
        <table className="header-table">
          <tr>
            <td style="vertical-align: top;">
              <div class="logo">منصة شبكتي لكروت الواي فاي</div>
              <div class="sub-logo">كشف حساب مالي رسمـي (Official Financial Statement)</div>
            </td>
            <td style="text-align: left; vertical-align: top; font-size: 12px;">
              <div><strong>اسم التاجر:</strong> ${params.vendorName}</div>
              <div><strong>رقم الحساب:</strong> <span style="font-family: monospace;">${params.accountNumber}</span></div>
              <div><strong>تاريخ الإصدار:</strong> ${todayStr}</div>
              <div><strong>الفترة:</strong> ${params.startDate || 'بداية الحساب'} إلى ${params.endDate || 'الحالي'}</div>
            </td>
          </tr>
        </table>

        <!-- Summary Grid -->
        <div class="summary-box">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-title">الرصيد الافتتاحي</div>
              <div class="summary-value" style="color: #475569;">${params.openingBalance.toLocaleString()} YER</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">إجمالي المدين (الخصم)</div>
              <div class="summary-value" style="color: #dc2626;">-${params.totalDebit.toLocaleString()} YER</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">إجمالي الدائن (الإيداع/الأرباح)</div>
              <div class="summary-value" style="color: #16a34a;">+${params.totalCredit.toLocaleString()} YER</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">صافي الحركة</div>
              <div class="summary-value" style="color: #0284c7;">${params.netMovement >= 0 ? '+' : ''}${params.netMovement.toLocaleString()} YER</div>
            </div>
            <div class="summary-item">
              <div class="summary-title">الرصيد الختامي</div>
              <div class="summary-value" style="color: #0f172a; font-size: 17px;">${params.closingBalance.toLocaleString()} YER</div>
            </div>
          </div>
        </div>

        <!-- Statement Table -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 15%;">التاريخ والوقت</th>
              <th style="width: 15%;">رقم المرجع</th>
              <th style="width: 32%;">البيان والتفاصيل</th>
              <th style="width: 12%; text-align: left;">مدين (-)</th>
              <th style="width: 12%; text-align: left;">دائن (+)</th>
              <th style="width: 14%; text-align: left;">الرصيد التراكمي</th>
              <th style="width: 10%; text-align: center;">الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Footer & Official Stamp -->
        <div class="footer">
          <div>تم إصدار هذا الكشف آلياً بواسطة المنصة الماليّة المركزية لشبكتي دون حاجة لتوقيع يدوي.</div>
          <div class="signature-box">ختم النظام المالي الرسمي - Shabakati Verified Ledger</div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}
