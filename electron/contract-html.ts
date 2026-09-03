import type { Contract, OfficeProfile } from '../shared/domain.js';

function escapeHtml(value: string | number) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!
  );
}

function money(value: number, currency: Contract['currency']) {
  return `${new Intl.NumberFormat(currency === 'IQD' ? 'ar-IQ' : 'en-US', {
    maximumFractionDigits: currency === 'IQD' ? 0 : 2,
  }).format(value)} ${currency === 'IQD' ? 'د.ع' : '$'}`;
}

export function contractHtml(contract: Contract, profile: OfficeProfile): string {
  const status = { draft: 'مسودة', completed: 'مكتمل', pending_payment: 'بانتظار الدفع' }[contract.status];
  const paymentRows = contract.payments.length
    ? contract.payments
        .map(
          (payment) =>
            `<tr><td>${escapeHtml(payment.paymentDate)}</td><td>${escapeHtml(payment.method)}</td><td>${money(
              payment.amount,
              contract.currency
            )}</td><td>${escapeHtml(payment.note)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="4">لا توجد دفعات مسجلة</td></tr>';

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 10mm 14mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Tahoma, Arial, sans-serif;
      color: #17211d;
      font-size: 11.5px;
      line-height: 1.55;
      margin: 0;
      padding: 0;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #b8954e;
      padding-bottom: 10px;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    h1 {
      font-size: 20px;
      margin: 0;
    }
    .muted {
      color: #68736d;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .box {
      border: 1px solid #d9dfdb;
      padding: 8px 10px;
      border-radius: 6px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .property-details, .vehicle-details {
      margin: 10px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .property-details h2, .vehicle-details h2 {
      font-size: 13px;
      margin: 0 0 6px;
      color: #795f2f;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .office-logo {
      max-height: 48px;
      max-width: 120px;
      object-fit: contain;
      border-radius: 4px;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 10px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .party-layout {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .party-details {
      flex: 1;
      min-width: 0;
    }
    .party-photo {
      width: 70px;
      height: 86px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #c9d1cc;
      background: #f8faf8;
      flex-shrink: 0;
    }
    .party h2 {
      font-size: 13px;
      margin: 0 0 4px;
      color: #795f2f;
    }
    .party p {
      margin: 2px 0;
    }
    .clauses {
      margin-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .clauses h2 {
      font-size: 13px;
      margin: 0 0 6px;
      color: #795f2f;
    }
    .clauses ol {
      padding-right: 20px;
      margin: 4px 0;
    }
    .clauses li {
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d9dfdb;
      padding: 5px 8px;
      text-align: right;
      font-size: 11px;
    }
    th {
      background: #f3f5f2;
    }
    .bottom-section {
      margin-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .summary {
      margin-right: auto;
      width: 260px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .summary div {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e4e7e5;
      padding: 3px 0;
    }
    footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #d9dfdb;
      text-align: center;
      color: #7b847f;
      font-size: 9.5px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .office-contact {
      margin-top: 3px;
    }
  </style></head><body>
    <header><div class="header-brand">${profile.logoData ? `<img src="${profile.logoData}" class="office-logo" alt="شعار المكتب" />` : ''}<div><h1>${escapeHtml(profile.officeName)}</h1><div class="muted">${profile.managerName ? `المسؤول: ${escapeHtml(profile.managerName)}` : 'نظام إدارة العقود'}</div></div></div><div><strong>${escapeHtml(contract.contractNumber)}</strong><br><span class="muted">${escapeHtml(status)}</span></div></header>
    <div class="meta"><div class="box"><span class="muted">نوع العقد</span><br><strong>${escapeHtml(contract.type)}</strong></div><div class="box"><span class="muted">تاريخ العقد</span><br><strong>${escapeHtml(contract.contractDate)}</strong></div><div class="box"><span class="muted">قيمة العقد</span><br><strong>${money(contract.amount, contract.currency)}</strong></div></div>
    ${contract.propertyDetails ? `<section class="box property-details"><h2 style="font-size:13px;margin:0 0 6px;color:#795f2f">بيانات العقار / المبيع</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"><div><span class="muted">نوع العقار: </span><strong>${escapeHtml(contract.propertyDetails.propertyType || '—')}</strong></div><div><span class="muted">رقم القطعة: </span><strong>${escapeHtml(contract.propertyDetails.plotNumber || '—')}</strong></div><div><span class="muted">المقاطعة: </span><strong>${escapeHtml(contract.propertyDetails.districtNumber || '—')}</strong></div><div><span class="muted">المساحة: </span><strong>${escapeHtml(contract.propertyDetails.area || '—')}</strong></div><div><span class="muted">المحافظة: </span><strong>${escapeHtml(contract.propertyDetails.governorate || '—')}</strong></div><div><span class="muted">القضاء/الناحية: </span><strong>${escapeHtml(contract.propertyDetails.cityDistrict || '—')}</strong></div></div>${contract.propertyDetails.locationNotes ? `<div style="margin-top:6px;padding-top:4px;border-top:1px dashed #d9dfdb"><span class="muted">الموقع والحدود: </span>${escapeHtml(contract.propertyDetails.locationNotes)}</div>` : ''}</section>` : ''}
    ${contract.vehicleDetails ? `<section class="box vehicle-details"><h2 style="font-size:13px;margin:0 0 6px;color:#795f2f">بيانات المركبة / المبيع</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px"><div><span class="muted">الماركة/الشركة: </span><strong>${escapeHtml(contract.vehicleDetails.make || '—')}</strong></div><div><span class="muted">الموديل/الطراز: </span><strong>${escapeHtml(contract.vehicleDetails.model || '—')}</strong></div><div><span class="muted">سنة الصنع: </span><strong>${escapeHtml(contract.vehicleDetails.year || '—')}</strong></div><div><span class="muted">اللون: </span><strong>${escapeHtml(contract.vehicleDetails.color || '—')}</strong></div><div><span class="muted">رقم الهيكل: </span><strong style="direction:ltr;display:inline-block">${escapeHtml(contract.vehicleDetails.chassisNumber || '—')}</strong></div><div><span class="muted">رقم اللوحة: </span><strong>${escapeHtml(contract.vehicleDetails.plateNumber || '—')}</strong></div></div></section>` : ''}
    <section class="parties"><div class="box party"><div class="party-layout">${contract.firstPartyPhoto ? `<img src="${contract.firstPartyPhoto}" class="party-photo" alt="صورة الطرف الأول" />` : ''}<div class="party-details"><h2>الطرف الأول</h2><p><strong>${escapeHtml(contract.firstParty.name)}</strong></p><p>الهاتف: ${escapeHtml(contract.firstParty.phone || '—')}</p><p>الهوية: ${escapeHtml(contract.firstParty.identifier || '—')}</p><p>العنوان: ${escapeHtml(contract.firstParty.address || '—')}</p></div></div></div>
    <div class="box party"><div class="party-layout">${contract.secondPartyPhoto ? `<img src="${contract.secondPartyPhoto}" class="party-photo" alt="صورة الطرف الثاني" />` : ''}<div class="party-details"><h2>الطرف الثاني</h2><p><strong>${escapeHtml(contract.secondParty.name)}</strong></p><p>الهاتف: ${escapeHtml(contract.secondParty.phone || '—')}</p><p>الهوية: ${escapeHtml(contract.secondParty.identifier || '—')}</p><p>العنوان: ${escapeHtml(contract.secondParty.address || '—')}</p></div></div></div></section>
    ${contract.notes ? `<div class="box" style="margin-top:10px"><strong>ملاحظات العقد</strong><br>${escapeHtml(contract.notes)}</div>` : ''}
    ${contract.clauses.length ? `<section class="clauses"><h2>${escapeHtml(contract.templateName || 'بنود العقد')}</h2><ol>${contract.clauses.map((clause) => `<li>${escapeHtml(clause)}</li>`).join('')}</ol></section>` : ''}
    <div class="bottom-section">
      <table><thead><tr><th>تاريخ الدفعة</th><th>طريقة الدفع</th><th>المبلغ</th><th>ملاحظة</th></tr></thead><tbody>${paymentRows}</tbody></table>
      <div class="summary"><div><span>قيمة العقد</span><strong>${money(contract.amount, contract.currency)}</strong></div><div><span>المستلم</span><strong>${money(contract.paidAmount, contract.currency)}</strong></div><div><span>المتبقي</span><strong>${money(contract.remainingAmount, contract.currency)}</strong></div></div>
      <footer>${escapeHtml(profile.footerNote || 'أُنشئ بواسطة نظام مكتوب — NAS CodeWorks')}<div class="office-contact">${[profile.phone, profile.address].filter(Boolean).map(escapeHtml).join(' · ')}</div></footer>
    </div>
  </body></html>`;
}
