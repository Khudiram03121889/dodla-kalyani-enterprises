export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(isoStringOrDate?: string | Date): string {
  const d = isoStringOrDate ? new Date(isoStringOrDate) : new Date();
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(isoStringOrDate?: string | Date): string {
  const d = isoStringOrDate ? new Date(isoStringOrDate) : new Date();
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export function generateInvoiceNumber(currentCount: number = 0): string {
  return `K-2627-${String(currentCount + 1).padStart(6, '0')}`;
}

export function generateOrderNumbers(currentCount: number = 0): { orderNo: string; invoiceNo: string } {
  const invoiceNo = generateInvoiceNumber(currentCount);
  // ponytail: order_no unified with invoice_no per user decision to eliminate separate order numbers
  return { orderNo: invoiceNo, invoiceNo };
}
