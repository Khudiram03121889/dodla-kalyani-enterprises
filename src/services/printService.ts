import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order, Route } from '../types';
import { generateInvoiceHtml, generateRouteSummaryHtml } from './pdfGenerator';
import { Alert, Platform } from 'react-native';

export async function printInvoice(order: Order): Promise<boolean> {
  try {
    const html = generateInvoiceHtml(order);
    await Print.printAsync({
      html,
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
    const { uri } = await Print.printToFileAsync({
      html,
    });

    if (Platform.OS === 'web') {
      window.open(uri, '_blank');
      return true;
    }

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
    await Print.printAsync({
      html,
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
    const { uri } = await Print.printToFileAsync({
      html,
    });

    if (Platform.OS === 'web') {
      window.open(uri, '_blank');
      return true;
    }

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
