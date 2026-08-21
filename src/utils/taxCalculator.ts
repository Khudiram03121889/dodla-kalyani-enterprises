import { COMPANY_DETAILS } from '../config/constants';

export interface TaxBreakdown {
  totalQty: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalGstRate: number;
  totalGstAmount: number;
  unroundedTotal: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateOrderTax(
  items: { qty: number; rate: number; gstRate?: number }[]
): TaxBreakdown {
  let totalQty = 0;
  let taxableAmount = 0;

  const gstRate = COMPANY_DETAILS.defaultGstRate; // 5%
  const halfRate = gstRate / 2; // 2.5% for CGST and 2.5% for SGST

  items.forEach((item) => {
    if (item.qty > 0) {
      totalQty += item.qty;
      const lineTaxable = Number((item.qty * item.rate).toFixed(2));
      taxableAmount += lineTaxable;
    }
  });

  taxableAmount = Number(taxableAmount.toFixed(2));

  // Statutory symmetric intra-state CGST & SGST (2.5% + 2.5%)
  const cgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
  const sgstAmount = cgstAmount;
  const totalGstAmount = Number((cgstAmount + sgstAmount).toFixed(2));

  const unroundedTotal = Number((taxableAmount + totalGstAmount).toFixed(2));
  const grandTotal = Math.round(unroundedTotal);
  const roundOff = Number((grandTotal - unroundedTotal).toFixed(2));

  return {
    totalQty,
    taxableAmount,
    cgstRate: halfRate,
    cgstAmount,
    sgstRate: halfRate,
    sgstAmount,
    totalGstRate: gstRate,
    totalGstAmount,
    unroundedTotal,
    roundOff,
    grandTotal,
  };
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    if (n < 20) {
      str += ONES[n] + ' ';
    } else {
      str += TENS[Math.floor(n / 10)] + ' ';
      if (n % 10 > 0) {
        str += ONES[n % 10] + ' ';
      }
    }
  }
  return str.trim();
}

function convertIndianGroup(num: number): string {
  if (num === 0) return '';
  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  let belowThousand = remainder % 1000;

  let result = '';
  if (crore > 0) {
    result += (crore < 1000 ? convertBelowThousand(crore) : convertIndianGroup(crore)) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (belowThousand > 0) {
    result += convertBelowThousand(belowThousand) + ' ';
  }
  return result.trim();
}

export function numberToWordsIndian(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only';
  const absNum = Math.abs(num);
  const wholePart = Math.floor(absNum);
  const paise = Math.round((absNum - wholePart) * 100);

  const rupeeWords = wholePart === 1 ? 'One Rupee' : wholePart > 0 ? `${convertIndianGroup(wholePart)} Rupees` : '';
  const paiseWords = paise > 0 ? `${convertBelowThousand(paise)} Paise` : '';

  if (rupeeWords && paiseWords) {
    return `${rupeeWords} and ${paiseWords} Only`.replace(/\s+/g, ' ');
  } else if (rupeeWords) {
    return `${rupeeWords} Only`.replace(/\s+/g, ' ');
  } else if (paiseWords) {
    return `${paiseWords} Only`.replace(/\s+/g, ' ');
  }
  return 'Zero Rupees Only';
}
