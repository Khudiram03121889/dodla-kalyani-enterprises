import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order, Route } from '../types';
import {
  generateInvoiceHtml,
  generateRouteSummaryHtml,
  generateCombinedInvoicesWithSummaryHtml,
} from './pdfGenerator';
import { Alert, Platform } from 'react-native';

// Exact A5 Dimensions in PostScript Points (72 PPI)
// Standard A5: 148 mm x 210 mm
// 148 mm * (72 pt / 25.4 mm) = 419.53 pt -> 420 pt
// 210 mm * (72 pt / 25.4 mm) = 595.28 pt -> 595 pt
export const A5_PAGE_WIDTH = 420;
export const A5_PAGE_HEIGHT = 595;

function printHtmlOnWeb(html: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 250);
      return true;
    }
  } catch (e) {
    console.error('Web print error:', e);
  }
  return false;
}

function shareHtmlOnWeb(html: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) return true;
  } catch (e) {
    console.error('Web tab error:', e);
  }
  return printHtmlOnWeb(html);
}

export async function printInvoice(order: Order): Promise<boolean> {
  try {
    const html = generateInvoiceHtml(order);
    if (Platform.OS === 'web') {
      return printHtmlOnWeb(html);
    }
    await Print.printAsync({
      html,
      width: A5_PAGE_WIDTH,
      height: A5_PAGE_HEIGHT,
    });
    return true;
  } catch (error) {
    console.error('Error printing invoice:', error);
    Alert.alert('Print Error', 'Could not open print dialog. Please try sharing as PDF.');
    return false;
  }
}

export async function shareInvoicePdf(order: Order): Promise<boolean> {
  try {
    const html = generateInvoiceHtml(order);
    if (Platform.OS === 'web') {
      return shareHtmlOnWeb(html);
    }
    const { uri } = await Print.printToFileAsync({
      html,
      width: A5_PAGE_WIDTH,
      height: A5_PAGE_HEIGHT,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice - ${order.invoice_no}`,
      });
      return true;
    } else {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }
  } catch (error) {
    console.error('Error sharing invoice PDF:', error);
    Alert.alert('Export Error', 'Could not generate or share PDF.');
    return false;
  }
}

export async function printRouteSummary(route: Route, orders: Order[]): Promise<boolean> {
  try {
    const html = generateRouteSummaryHtml(route, orders);
    if (Platform.OS === 'web') {
      return printHtmlOnWeb(html);
    }
    await Print.printAsync({
      html,
      width: A5_PAGE_WIDTH,
      height: A5_PAGE_HEIGHT,
    });
    return true;
  } catch (error) {
    console.error('Error printing route summary:', error);
    Alert.alert('Print Error', 'Could not open print dialog for route summary.');
    return false;
  }
}

export async function shareRouteSummaryPdf(route: Route, orders: Order[]): Promise<boolean> {
  try {
    const html = generateRouteSummaryHtml(route, orders);
    if (Platform.OS === 'web') {
      return shareHtmlOnWeb(html);
    }
    const { uri } = await Print.printToFileAsync({
      html,
      width: A5_PAGE_WIDTH,
      height: A5_PAGE_HEIGHT,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Route Summary - ${route.name}`,
      });
      return true;
    } else {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }
  } catch (error) {
    console.error('Error sharing route summary:', error);
    Alert.alert('Export Error', 'Could not generate or share summary PDF.');
    return false;
  }
}

export async function printCombinedInvoicesPdf(
  orders: Order[],
  routeName?: string
): Promise<boolean> {
  try {
    const html = generateCombinedInvoicesWithSummaryHtml(orders, routeName);
    if (Platform.OS === 'web') {
      return printHtmlOnWeb(html);
    }
    await Print.printAsync({
      html,
      width: A5_PAGE_WIDTH,
      height: A5_PAGE_HEIGHT,
    });
    return true;
  } catch (error) {
    console.error('Error printing combined invoices:', error);
    Alert.alert('Print Error', 'Could not open print dialog for combined invoices.');
    return false;
  }
}

export async function shareCombinedInvoicesPdf(
  orders: Order[],
  routeName?: string
): Promise<boolean> {
  try {
    const html = generateCombinedInvoicesWithSummaryHtml(orders, routeName);
    if (Platform.OS === 'web') {
      return shareHtmlOnWeb(html);
    }
    const { uri } = await Print.printToFileAsync({
      html,
      width: A5_PAGE_WIDTH,
      height: A5_PAGE_HEIGHT,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Combined Invoices (${orders.length} Invoices + Summary)`,
      });
      return true;
    } else {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }
  } catch (error) {
    console.error('Error sharing combined invoices PDF:', error);
    Alert.alert('Export Error', 'Could not generate or share combined PDF.');
    return false;
  }
}

