import { Order, Route } from '../types';
import { COMPANY_DETAILS } from '../config/constants';
import { KALYANI_LOGO_BASE64 } from '../assets/logoBase64';
import { numberToWordsIndian } from '../utils/taxCalculator';
import { formatDateTime } from '../utils/formatters';

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const CATEGORY_HSN_MAP: Record<string, string> = {
  'dodla milk & curd': '04012000',
  'dodla ghee & butter': '04059020',
  'dodla paneer & sweets': '21069099',
  'dodla flavoured milk': '22029990',
  'beverages & dairy snacks': '04039010',
};

export function getCategoryHsn(catName?: string): string {
  if (!catName) return '04012000';
  const lower = catName.trim().toLowerCase();
  if (CATEGORY_HSN_MAP[lower]) return CATEGORY_HSN_MAP[lower];
  if (lower.includes('milk') || lower.includes('curd')) return '04012000';
  if (lower.includes('ghee') || lower.includes('butter')) return '04059020';
  if (lower.includes('paneer')) return '04061000';
  if (lower.includes('sweet') || lower.includes('peda') || lower.includes('papdi') || lower.includes('jamun')) return '21069099';
  if (lower.includes('flavour') || lower.includes('badam')) return '22029990';
  if (lower.includes('beverage') || lower.includes('snack') || lower.includes('buttermilk')) return '04039010';
  return '21069099';
}

function generateInvoiceBoxContent(order: Order): string {
  const formattedDate = formatDateTime(order.created_at);

  // Group items by category to build the category summary box
  const categoryQtyMap: Record<string, number> = {};
  order.items.forEach((item) => {
    const cat = item.category_name || 'General';
    categoryQtyMap[cat] = (categoryQtyMap[cat] || 0) + item.qty;
  });

  const categoryHeaders = Object.keys(categoryQtyMap);
  const categorySummaryHtml =
    categoryHeaders.length > 0
      ? `
      <table class="category-table">
        <tr>
          <th style="width: 50px;">ITEM</th>
          ${categoryHeaders.map((cat) => `<th>${escapeHtml(cat.toUpperCase())}</th>`).join('')}
          <th style="width: 50px;">TOTAL</th>
        </tr>
        <tr>
          <td style="font-weight: bold; background: #fafafa; font-size: 8px;">HSN</td>
          ${categoryHeaders.map((cat) => `<td style="font-weight: bold; font-size: 8px;">${getCategoryHsn(cat)}</td>`).join('')}
          <td style="font-weight: bold; font-size: 8px;">-</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">QTY</td>
          ${categoryHeaders.map((cat) => `<td style="font-weight: bold;">${categoryQtyMap[cat]}</td>`).join('')}
          <td><strong>${order.total_qty}</strong></td>
        </tr>
      </table>
    `
      : '';

  const itemRowsHtml = order.items
    .map((item, idx) => {
      const hsn = item.hsn_code || getCategoryHsn(item.category_name);
      return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: left;">
          ${escapeHtml(item.product_name)} ( ${escapeHtml(hsn)} )
        </td>
        <td style="text-align: center;">${item.qty}</td>
        <td style="text-align: right;">${(item.qty * item.rate).toFixed(2)}</td>
        <td style="text-align: right;">${item.taxable_amount.toFixed(2)}</td>
        <td style="text-align: center;">${item.gst_rate}</td>
        <td style="text-align: right;">${item.gst_amount.toFixed(2)}</td>
        <td style="text-align: right;"><strong>${item.total_amount.toFixed(2)}</strong></td>
      </tr>
    `;
    })
    .join('');

  return `
  <div class="invoice-box">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 95px; text-align: left; vertical-align: middle;"></td>
        <td style="text-align: center; vertical-align: middle;">
          <div class="tax-invoice-heading">TAX INVOICE</div>
          <div class="company-title">${COMPANY_DETAILS.name}</div>
          <div class="company-address">${COMPANY_DETAILS.addressLine1} Mob. : ${COMPANY_DETAILS.phone}</div>
        </td>
        <td style="width: 95px; text-align: right; vertical-align: middle;">
          <img src="${KALYANI_LOGO_BASE64}" class="logo-img" alt="Kalyani Enterprises Logo" />
        </td>
      </tr>
    </table>

    <!-- GST & FSSAI Bar -->
    <table class="gst-fssai-bar">
      <tr>
        <td style="width: 50%; text-align: left;"><strong>GST No. :</strong> ${COMPANY_DETAILS.gstin}</td>
        <td style="width: 50%; text-align: right;"><strong>FSSAI No. :</strong> ${COMPANY_DETAILS.fssai}</td>
      </tr>
    </table>

    <!-- Party and Order Details -->
    <table class="meta-table">
      <tr>
        <td class="party-col">
          <div style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 1px; margin-bottom: 2px;">Bill To/Ship To Party Details</div>
          <div style="font-size: 11px; font-weight: 900; margin-bottom: 2px;">${escapeHtml(order.shop_name.toUpperCase())}</div>
          <div style="margin-bottom: 2px;">${escapeHtml(order.shop_address.toUpperCase())}</div>
          <div style="font-weight: bold; margin-bottom: 2px;">Mo.${escapeHtml(order.shop_phone)}</div>
          ${order.shop_incharge ? `<div style="margin-bottom: 2px;"><strong>Incharge:</strong> ${escapeHtml(order.shop_incharge.toUpperCase())}</div>` : ''}
          <div style="margin-bottom: 2px;"><strong>GST No.</strong> ${escapeHtml(order.shop_gstin || '')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>FSSAI No.</strong> ${escapeHtml(order.shop_fssai || '')}</div>
          <div><strong>Place of Supply :</strong> ${COMPANY_DETAILS.placeOfSupply}</div>
        </td>
        <td class="invoice-col">
          <div class="invoice-meta-top">
            <div><strong>Invoice No.</strong> <span style="font-size: 11px; font-weight: 900;">${escapeHtml(order.invoice_no)}</span></div>
            <div style="margin-top: 2px;"><strong>Invoice Date :</strong> ${formattedDate}</div>
          </div>
          <table class="salesman-subtable">
            <tr>
              <th style="width: 40%;">Salesman Name &amp; No.</th>
              <th style="width: 30%;">Delivered By Name &amp; Mo.</th>
              <th style="width: 30%; border-right: none;">Route :</th>
            </tr>
            <tr>
              <td style="font-weight: bold;">${escapeHtml(order.executive_name)} /<br />${escapeHtml(order.executive_phone)}</td>
              <td>/</td>
              <td style="border-right: none; font-weight: bold;">${escapeHtml(order.route_name.toUpperCase())}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25px;">Sr. No.</th>
          <th>Product Name</th>
          <th style="width: 32px;">Qty</th>
          <th style="width: 55px;">Amount</th>
          <th style="width: 58px;">Taxable Amt.</th>
          <th style="width: 34px;">GST %</th>
          <th style="width: 52px;">GST Amt</th>
          <th style="width: 58px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        <tr style="font-weight: bold; background: #fafafa;">
          <td colspan="2" style="text-align: right;">TOTAL:</td>
          <td style="text-align: center;">${order.total_qty}</td>
          <td style="text-align: right;">₹${order.taxable_amount.toFixed(2)}</td>
          <td style="text-align: right;">₹${order.taxable_amount.toFixed(2)}</td>
          <td></td>
          <td style="text-align: right;">₹${order.total_gst.toFixed(2)}</td>
          <td style="text-align: right;">₹${(order.taxable_amount + order.total_gst).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Category Summary Breakdown Box -->
    ${categorySummaryHtml}

    <!-- Footer & Signatory -->
    <table class="footer-table">
      <tr>
        <td style="width: 55%; vertical-align: top;">
          <div class="bank-details-box" style="font-size: 8.5px; line-height: 1.35;">
            <div style="font-weight: bold; font-size: 9px; margin-bottom: 2px;">Bank Details :</div>
            <div><strong>Bank Name :</strong> ${COMPANY_DETAILS.bankDetails.bankName}</div>
            <div><strong>Account No :</strong> ${COMPANY_DETAILS.bankDetails.accountNo}</div>
            <div><strong>IFSC Code :</strong> ${COMPANY_DETAILS.bankDetails.ifscCode}</div>
          </div>
        </td>
        <td style="width: 45%; vertical-align: top; text-align: right;">
          <div class="signatory-box">
            <div style="font-size: 11px; font-weight: 900; letter-spacing: 0.3px;">${COMPANY_DETAILS.name}</div>
            <div style="margin-top: 55px; border-top: 1px dashed #000; display: inline-block; padding-top: 2px; width: 140px; text-align: center; font-weight: bold; font-size: 8.5px;">
              Authorised Signatory
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export function generateInvoiceHtml(order: Order): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${escapeHtml(order.invoice_no)}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 3mm;
    }
    html, body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
      margin: 0;
      padding: 0;
      width: 100%;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-box {
      border: 1.5px solid #000;
      padding: 4px;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
    }
    .company-title {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 1px 0;
      text-align: center;
    }
    .tax-invoice-heading {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 1px;
    }
    .company-address {
      font-size: 10px;
      font-weight: bold;
      text-align: center;
    }
    .logo-img {
      max-height: 85px;
      max-width: 95px;
      object-fit: contain;
    }
    .gst-fssai-bar {
      width: 100%;
      border-top: 1.2px solid #000;
      border-bottom: 1.2px solid #000;
      border-collapse: collapse;
      font-size: 9.5px;
      font-weight: bold;
      margin-top: 3px;
      margin-bottom: 3px;
    }
    .gst-fssai-bar td {
      padding: 2px 4px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
    }
    .meta-table td {
      vertical-align: top;
    }
    .party-col {
      width: 50%;
      border: 1.2px solid #000;
      padding: 4px;
      font-size: 9px;
    }
    .invoice-col {
      width: 50%;
      border: 1.2px solid #000;
      border-left: none;
      padding: 0;
      font-size: 9px;
    }
    .invoice-meta-top {
      padding: 4px 6px;
      border-bottom: 1px solid #000;
    }
    .salesman-subtable {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-size: 8.5px;
    }
    .salesman-subtable th {
      font-weight: bold;
      padding: 2.5px 2px;
      border-right: 1px solid #000;
      background: #f2f2f2;
    }
    .salesman-subtable td {
      padding: 3px 2px;
      border-top: 1px solid #000;
      border-right: 1px solid #000;
      font-size: 8.5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      margin-bottom: 3px;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .items-table th, .items-table td {
      border: 1px solid #000;
      padding: 3px 3px;
      font-size: 8.5px;
    }
    .items-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .category-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      margin-bottom: 2px;
      page-break-inside: avoid;
    }
    .category-table th, .category-table td {
      border: 1px solid #000;
      padding: 2.5px 3px;
      text-align: center;
      font-size: 8.5px;
    }
    .category-table th {
      background: #f2f2f2;
      font-weight: bold;
    }
    .footer-table {
      width: 100%;
      margin-top: 6px;
      padding-top: 4px;
      page-break-inside: avoid;
    }
    .signatory-box {
      text-align: right;
      font-size: 9px;
    }
    .terms-box {
      font-size: 7.5px;
      color: #333;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  ${generateInvoiceBoxContent(order)}
</body>
</html>
  `;
}

export function generateCombinedInvoicesWithSummaryHtml(
  orders: Order[],
  routeName?: string
): string {
  const effectiveRouteName =
    routeName || (orders.length > 0 ? orders[0].route_name : 'Combined Route');
  const generatedTime = formatDateTime(new Date());
  const totalAmount = orders.reduce((sum, o) => sum + o.grand_total, 0);

  // 1. Generate individual invoice pages
  const invoicePagesHtml = orders
    .map(
      (order) => `
    <div class="page-container invoice-page">
      ${generateInvoiceBoxContent(order)}
    </div>
  `
    )
    .join('');

  // 2. Generate the 39th page route summary table rows
  const summaryRowsHtml = orders
    .map(
      (o, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold;">${escapeHtml(o.invoice_no)}</td>
        <td><strong>${escapeHtml(o.shop_name)}</strong> - ${escapeHtml(o.shop_address)}</td>
        <td style="text-align: center;">${escapeHtml(o.shop_phone)}</td>
        <td style="text-align: right; font-weight: bold;">₹${o.grand_total.toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoices &amp; Route Summary - ${escapeHtml(effectiveRouteName)}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 3mm;
    }
    html, body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #000;
      margin: 0;
      padding: 0;
      width: 100%;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      width: 100%;
      box-sizing: border-box;
    }
    .invoice-page {
      page-break-after: always;
      break-after: page;
      margin-bottom: 20px;
    }
    .summary-page {
      page-break-inside: avoid;
      padding: 4px;
    }
    .invoice-box {
      border: 1.5px solid #000;
      padding: 4px;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
    }
    .company-title {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 1px 0;
      text-align: center;
    }
    .tax-invoice-heading {
      font-size: 12px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 1px;
    }
    .company-address {
      font-size: 10px;
      font-weight: bold;
      text-align: center;
    }
    .logo-img {
      max-height: 85px;
      max-width: 95px;
      object-fit: contain;
    }
    .gst-fssai-bar {
      width: 100%;
      border-top: 1.2px solid #000;
      border-bottom: 1.2px solid #000;
      border-collapse: collapse;
      font-size: 9.5px;
      font-weight: bold;
      margin-top: 3px;
      margin-bottom: 3px;
    }
    .gst-fssai-bar td {
      padding: 2px 4px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3px;
    }
    .meta-table td {
      vertical-align: top;
    }
    .party-col {
      width: 50%;
      border: 1.2px solid #000;
      padding: 4px;
      font-size: 9px;
    }
    .invoice-col {
      width: 50%;
      border: 1.2px solid #000;
      border-left: none;
      padding: 0;
      font-size: 9px;
    }
    .invoice-meta-top {
      padding: 4px 6px;
      border-bottom: 1px solid #000;
    }
    .salesman-subtable {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-size: 8.5px;
    }
    .salesman-subtable th {
      font-weight: bold;
      padding: 2.5px 2px;
      border-right: 1px solid #000;
      background: #f2f2f2;
    }
    .salesman-subtable td {
      padding: 3px 2px;
      border-top: 1px solid #000;
      border-right: 1px solid #000;
      font-size: 8.5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      margin-bottom: 3px;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .items-table th, .items-table td {
      border: 1px solid #000;
      padding: 3px 3px;
      font-size: 8.5px;
    }
    .items-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .category-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      margin-bottom: 2px;
      page-break-inside: avoid;
    }
    .category-table th, .category-table td {
      border: 1px solid #000;
      padding: 2.5px 3px;
      text-align: center;
      font-size: 8.5px;
    }
    .category-table th {
      background: #f2f2f2;
      font-weight: bold;
    }
    .footer-table {
      width: 100%;
      margin-top: 6px;
      padding-top: 4px;
      page-break-inside: avoid;
    }
    .signatory-box {
      text-align: right;
      font-size: 9px;
    }
    .summary-header-box {
      border-bottom: 1.5px solid #000;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .summary-title {
      font-size: 15px;
      font-weight: 900;
      margin: 0 0 3px 0;
    }
    .summary-subhead {
      font-size: 10.5px;
      margin: 1px 0;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .summary-table tr {
      page-break-inside: avoid;
    }
    .summary-table th, .summary-table td {
      border: 1px solid #000;
      padding: 4px 5px;
      font-size: 9px;
    }
    .summary-table th {
      background-color: #e8e8e8;
      font-weight: bold;
      text-align: center;
    }
    .summary-total-row {
      background-color: #f2f2f2;
      font-size: 10.5px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${invoicePagesHtml}

  <!-- Final Page: Page 39 Route Summary Sheet -->
  <div class="page-container summary-page">
    <div class="summary-header-box">
      <div class="summary-title">${COMPANY_DETAILS.name}</div>
      <div class="summary-subhead"><strong>Route Summary Sheet (Page 39 Format)</strong></div>
      <div class="summary-subhead"><strong>Route Name:</strong> ${escapeHtml(effectiveRouteName)}</div>
      <div class="summary-subhead"><strong>Generated On:</strong> ${generatedTime}</div>
      <div class="summary-subhead"><strong>Total Shops Punched:</strong> ${orders.length}</div>
    </div>

    <table class="summary-table">
      <thead>
        <tr>
          <th style="width: 35px;">No.</th>
          <th style="width: 90px;">Bill No.</th>
          <th>Party Name &amp; Address</th>
          <th style="width: 95px;">Mobile No.</th>
          <th style="width: 95px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRowsHtml}
        <tr class="summary-total-row">
          <td colspan="4" style="text-align: right;">Total Route Amount:</td>
          <td style="text-align: right; font-size: 13px; color: #000;">₹${totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>
  `;
}

export function generateRouteSummaryHtml(route: Route, orders: Order[]): string {
  const generatedTime = formatDateTime(new Date());
  const routeOrders = orders.filter((o) => o.route_id === route.id);
  const totalAmount = routeOrders.reduce((sum, o) => sum + o.grand_total, 0);

  const rowsHtml = routeOrders
    .map(
      (o, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: bold;">${escapeHtml(o.invoice_no)}</td>
        <td><strong>${escapeHtml(o.shop_name)}</strong> - ${escapeHtml(o.shop_address)}</td>
        <td style="text-align: center;">${escapeHtml(o.shop_phone)}</td>
        <td style="text-align: right; font-weight: bold;">₹${o.grand_total.toLocaleString('en-IN')}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Route Summary - ${escapeHtml(route.name)}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 5mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .header-box {
      border-bottom: 1.5px solid #000;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 15px;
      font-weight: 900;
      margin: 0 0 3px 0;
    }
    .subhead {
      font-size: 10.5px;
      margin: 1px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    table tr {
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #000;
      padding: 4px 5px;
      font-size: 9px;
    }
    th {
      background-color: #e8e8e8;
      font-weight: bold;
      text-align: center;
    }
    .total-row {
      background-color: #f2f2f2;
      font-size: 10.5px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="title">${COMPANY_DETAILS.name}</div>
    <div class="subhead"><strong>Route Name:</strong> ${escapeHtml(route.name)}</div>
    <div class="subhead"><strong>Generated On:</strong> ${generatedTime}</div>
    <div class="subhead"><strong>Total Shops Punched:</strong> ${routeOrders.length}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">No.</th>
        <th style="width: 110px;">Bill No.</th>
        <th>Party Name & Address</th>
        <th style="width: 100px;">Mobile No.</th>
        <th style="width: 100px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="4" style="text-align: right;">Total Amount:</td>
        <td style="text-align: right; font-size: 14px; color: #000;">₹${totalAmount.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
  `;
}
