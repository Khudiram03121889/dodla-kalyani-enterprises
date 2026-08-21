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

export function generateInvoiceHtml(order: Order): string {
  const amountInWords = numberToWordsIndian(order.grand_total);
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
          <th>ITEM CATEGORY</th>
          ${categoryHeaders.map((cat) => `<th>${escapeHtml(cat.toUpperCase())}</th>`).join('')}
          <th>TOTAL</th>
        </tr>
        <tr>
          <td>QTY</td>
          ${categoryHeaders.map((cat) => `<td>${categoryQtyMap[cat]}</td>`).join('')}
          <td><strong>${order.total_qty}</strong></td>
        </tr>
      </table>
    `
      : '';

  const itemRowsHtml = order.items
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${escapeHtml(item.product_name)}</td>
        <td style="text-align: center;">${item.qty}</td>
        <td style="text-align: right;">${item.rate.toFixed(2)}</td>
        <td style="text-align: right;">${(item.qty * item.rate).toFixed(2)}</td>
        <td style="text-align: right;">${item.taxable_amount.toFixed(2)}</td>
        <td style="text-align: center;">${item.gst_rate}%</td>
        <td style="text-align: right;">${item.gst_amount.toFixed(2)}</td>
        <td style="text-align: right;"><strong>${item.total_amount.toFixed(2)}</strong></td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${escapeHtml(order.invoice_no)}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 4mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 9.5px;
      color: #111;
      margin: 0;
      padding: 0;
      line-height: 1.25;
    }
    .invoice-box {
      border: 1.2px solid #000;
      padding: 6px;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-bottom: 1.2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    .company-title {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 0.3px;
      margin: 0 0 2px 0;
    }
    .logo-img {
      max-height: 48px;
      max-width: 90px;
      object-fit: contain;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .meta-table td {
      vertical-align: top;
      padding: 3px;
      border: 1px solid #ccc;
      font-size: 8.5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      margin-bottom: 5px;
    }
    .items-table tr {
      page-break-inside: avoid;
    }
    .items-table th, .items-table td {
      border: 1px solid #000;
      padding: 2.5px 3.5px;
      font-size: 8px;
    }
    .items-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
    }
    .category-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      margin-bottom: 5px;
      page-break-inside: avoid;
    }
    .category-table th, .category-table td {
      border: 1px solid #777;
      padding: 2px 3px;
      text-align: center;
      font-size: 7.5px;
    }
    .category-table th {
      background: #fafafa;
    }
    .tax-summary-box {
      border: 1px solid #000;
      padding: 4px;
      margin-top: 4px;
      background: #fdfdfd;
      font-size: 8.5px;
      page-break-inside: avoid;
    }
    .grand-total-row {
      font-size: 11px;
      font-weight: bold;
      background-color: #eee;
    }
    .footer-table {
      width: 100%;
      margin-top: 6px;
      border-top: 1px solid #000;
      padding-top: 4px;
      page-break-inside: avoid;
    }
    .signatory-box {
      text-align: right;
      font-weight: bold;
      font-size: 8px;
    }
    .terms-box {
      font-size: 7.5px;
      color: #333;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 95px; text-align: left; vertical-align: middle;">
          <img src="${KALYANI_LOGO_BASE64}" class="logo-img" alt="Kalyani Enterprises Logo" />
        </td>
        <td style="text-align: center; vertical-align: middle;">
          <div style="font-size: 10px; font-weight: bold; text-decoration: underline;">TAX INVOICE Original / Duplicate</div>
          <div class="company-title">${COMPANY_DETAILS.name}</div>
          <div style="font-size: 8.5px;">${COMPANY_DETAILS.addressLine1} ${COMPANY_DETAILS.addressLine2} | Mob: <strong>${COMPANY_DETAILS.phone}</strong></div>
          <div style="font-size: 8.5px;"><strong>GST No.:</strong> ${COMPANY_DETAILS.gstin} &nbsp;|&nbsp; <strong>FSSAI No.:</strong> ${COMPANY_DETAILS.fssai}</div>
        </td>
      </tr>
    </table>

    <!-- Party and Order Details -->
    <table class="meta-table">
      <tr>
        <td style="width: 50%;">
          <strong>Bill To / Ship To Party Details:</strong><br />
          <strong style="font-size: 12px;">${escapeHtml(order.shop_name)}</strong><br />
          ${escapeHtml(order.shop_address)}<br />
          <strong>Mobile:</strong> ${escapeHtml(order.shop_phone)}<br />
          ${order.shop_incharge ? `<strong>Incharge:</strong> ${escapeHtml(order.shop_incharge)}<br />` : ''}
          <strong>GST No.:</strong> ${escapeHtml(order.shop_gstin) || 'Unregistered'} &nbsp;|&nbsp; <strong>FSSAI No.:</strong> ${escapeHtml(order.shop_fssai) || 'N/A'}<br />
          <strong>Place of Supply:</strong> ${COMPANY_DETAILS.placeOfSupply}
        </td>
        <td style="width: 50%;">
          <strong>Order No.:</strong> ${escapeHtml(order.order_no)}<br />
          <strong>Invoice No.:</strong> <span style="font-size: 12px; font-weight: bold;">${escapeHtml(order.invoice_no)}</span><br />
          <strong>Invoice Date & Time:</strong> ${formattedDate}<br />
          <strong>Route:</strong> <span style="font-weight: bold; color: #000;">${escapeHtml(order.route_name)}</span><br />
          <strong>Salesman Name & No.:</strong> ${escapeHtml(order.executive_name)} / ${escapeHtml(order.executive_phone)}<br />
        </td>
      </tr>
    </table>

    <!-- Items Table (Discount column removed) -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 30px;">Sr.</th>
          <th>Product Name</th>
          <th style="width: 35px;">Qty</th>
          <th style="width: 55px;">Rate (₹)</th>
          <th style="width: 65px;">Total Amt</th>
          <th style="width: 65px;">Taxable Amt</th>
          <th style="width: 45px;">GST %</th>
          <th style="width: 55px;">GST Amt</th>
          <th style="width: 65px;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}
        <tr style="font-weight: bold; background: #fafafa;">
          <td colspan="2" style="text-align: right;">TOTAL:</td>
          <td style="text-align: center;">${order.total_qty}</td>
          <td></td>
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

    <!-- Tax & Grand Total Summary -->
    <div class="tax-summary-box">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <div><strong>Total GST Payable Breakup:</strong></div>
            <div>CGST (2.5%): <strong>₹${order.cgst_amount.toFixed(2)}</strong> &nbsp;|&nbsp; SGST (2.5%): <strong>₹${order.sgst_amount.toFixed(2)}</strong> &nbsp;|&nbsp; IGST (0%): <strong>₹0.00</strong></div>
            <div style="margin-top: 4px;"><strong>Total GST:</strong> ₹${order.total_gst.toFixed(2)}</div>
            <div style="margin-top: 4px;"><strong>Round Off:</strong> ${order.round_off >= 0 ? '+' : ''}${order.round_off.toFixed(2)}</div>
            <div style="margin-top: 6px;"><strong>Amount in Words:</strong><br /><em>${amountInWords}</em></div>
          </td>
          <td style="vertical-align: middle; text-align: right; width: 40%;">
            <div style="border: 2px solid #000; padding: 8px; background: #f2f2f2; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase;">Grand Total</div>
              <div style="font-size: 20px; font-weight: 900; color: #000;">₹${order.grand_total.toLocaleString('en-IN')}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer & Signatory -->
    <table class="footer-table">
      <tr>
        <td style="width: 60%; vertical-align: top;">
          <div class="terms-box">
            ${COMPANY_DETAILS.terms.map((t) => `<div>${t}</div>`).join('')}
            <div style="margin-top: 4px;">(Invoice generated on ${formattedDate})</div>
          </div>
        </td>
        <td style="width: 40%; vertical-align: bottom; text-align: right;">
          <div class="signatory-box">
            <div>For, <strong>${COMPANY_DETAILS.name}</strong></div>
            <div style="margin-top: 35px; border-top: 1px dashed #444; display: inline-block; padding-top: 4px;">
              Authorised Signatory
            </div>
          </div>
        </td>
      </tr>
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
