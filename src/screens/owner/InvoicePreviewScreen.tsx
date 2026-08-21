import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { COMPANY_DETAILS } from '../../config/constants';
import { printInvoice, shareInvoicePdf } from '../../services/printService';
import { numberToWordsIndian } from '../../utils/taxCalculator';
import { formatDateTime, formatCurrency } from '../../utils/formatters';

export const InvoicePreviewScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { markOrderAsPrinted, orders } = useStore();

  const { orderId } = route.params as { orderId: string };
  const currentOrder = orders.find((o) => o.id === orderId);

  const [isPrinting, setIsPrinting] = useState(false);

  if (!currentOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Invoice not found or deleted.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isAlreadyPrinted = currentOrder.status === 'printed';

  const handlePrint = async () => {
    setIsPrinting(true);
    const success = await printInvoice(currentOrder);
    setIsPrinting(false);
    if (success && !isAlreadyPrinted) {
      await markOrderAsPrinted(currentOrder.id);
    }
  };

  const handleShare = async () => {
    setIsPrinting(true);
    const success = await shareInvoicePdf(currentOrder);
    setIsPrinting(false);
    if (success && !isAlreadyPrinted) {
      await markOrderAsPrinted(currentOrder.id);
    }
  };

  const handleTogglePrintedStatus = async () => {
    if (!isAlreadyPrinted) {
      await markOrderAsPrinted(currentOrder.id);
      Alert.alert('Status Updated', 'Marked as printed. This bill is now in Printed History.');
    }
  };

  const amountInWords = numberToWordsIndian(currentOrder.grand_total);

  // Group items by category for summary box
  const categoryQtyMap: Record<string, number> = {};
  currentOrder.items.forEach((item) => {
    const cat = item.category_name || 'General';
    categoryQtyMap[cat] = (categoryQtyMap[cat] || 0) + item.qty;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.topBackBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.topTitle}>{currentOrder.invoice_no}</Text>
          <Text style={styles.topSubtitle}>Tax Invoice Preview</Text>
        </View>
        <View style={styles.statusPill}>
          <Text
            style={[
              styles.statusPillText,
              isAlreadyPrinted ? styles.printedText : styles.pendingText,
            ]}
          >
            {isAlreadyPrinted ? 'PRINTED' : 'PENDING'}
          </Text>
        </View>
      </View>

      {/* Invoice Document Canvas */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.invoiceDocument}>
          {/* Header */}
          <View style={styles.invoiceHeader}>
            <Image
              source={require('../../../assets/kalyani_enterprise_logo.png')}
              style={styles.invoiceLogo}
              resizeMode="contain"
            />
            <View style={styles.companyInfo}>
              <Text style={styles.taxInvoiceBadge}>TAX INVOICE Original / Duplicate</Text>
              <Text style={styles.companyName}>{COMPANY_DETAILS.name}</Text>
              <Text style={styles.companyAddr}>
                {COMPANY_DETAILS.addressLine1} {COMPANY_DETAILS.addressLine2}
              </Text>
              <Text style={styles.companyPhone}>Mob: {COMPANY_DETAILS.phone}</Text>
              <Text style={styles.companyRegs}>
                GST No: {COMPANY_DETAILS.gstin} | FSSAI: {COMPANY_DETAILS.fssai}
              </Text>
            </View>
          </View>

          {/* Party and Order Details Box */}
          <View style={styles.metaBox}>
            <View style={styles.partyCol}>
              <Text style={styles.metaHeading}>Bill To / Ship To Party Details:</Text>
              <Text style={styles.partyName}>{currentOrder.shop_name}</Text>
              <Text style={styles.metaLine}>{currentOrder.shop_address}</Text>
              <Text style={styles.metaLine}>Mo: {currentOrder.shop_phone}</Text>
              {currentOrder.shop_incharge ? (
                <Text style={styles.metaLine}>Incharge: {currentOrder.shop_incharge}</Text>
              ) : null}
              <Text style={styles.metaLine}>
                GST No: {currentOrder.shop_gstin || 'Unregistered'}
              </Text>
              <Text style={styles.metaLine}>
                Place of Supply: {COMPANY_DETAILS.placeOfSupply}
              </Text>
            </View>

            <View style={styles.orderCol}>
              <Text style={styles.metaLine}>
                <Text style={{ fontWeight: 'bold' }}>Order No.:</Text> {currentOrder.order_no}
              </Text>
              <Text style={styles.metaLine}>
                <Text style={{ fontWeight: 'bold' }}>Invoice No.:</Text> {currentOrder.invoice_no}
              </Text>
              <Text style={styles.metaLine}>
                <Text style={{ fontWeight: 'bold' }}>Date & Time:</Text> {formatDateTime(currentOrder.created_at)}
              </Text>
              <Text style={styles.metaLine}>
                <Text style={{ fontWeight: 'bold' }}>Route:</Text> {currentOrder.route_name}
              </Text>
              <Text style={styles.metaLine}>
                <Text style={{ fontWeight: 'bold' }}>Salesman:</Text> {currentOrder.executive_name} ({currentOrder.executive_phone})
              </Text>
            </View>
          </View>

          {/* Items Table (Discount column removed) */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, { width: 26 }]}>Sr.</Text>
              <Text style={[styles.th, { flex: 2, textAlign: 'left' }]}>Product Name</Text>
              <Text style={[styles.th, { width: 32 }]}>Qty</Text>
              <Text style={[styles.th, { width: 44 }]}>Rate</Text>
              <Text style={[styles.th, { width: 50 }]}>Taxable</Text>
              <Text style={[styles.th, { width: 34 }]}>GST</Text>
              <Text style={[styles.th, { width: 42 }]}>GST ₹</Text>
              <Text style={[styles.th, { width: 52 }]}>Total</Text>
            </View>

            {currentOrder.items.map((item, idx) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.td, { width: 26, textAlign: 'center' }]}>{idx + 1}</Text>
                <Text style={[styles.td, { flex: 2, textAlign: 'left' }]}>{item.product_name}</Text>
                <Text style={[styles.td, { width: 32, textAlign: 'center' }]}>{item.qty}</Text>
                <Text style={[styles.td, { width: 44, textAlign: 'right' }]}>
                  {item.rate.toFixed(2)}
                </Text>
                <Text style={[styles.td, { width: 50, textAlign: 'right' }]}>
                  {item.taxable_amount.toFixed(2)}
                </Text>
                <Text style={[styles.td, { width: 34, textAlign: 'center' }]}>
                  {item.gst_rate}%
                </Text>
                <Text style={[styles.td, { width: 42, textAlign: 'right' }]}>
                  {item.gst_amount.toFixed(2)}
                </Text>
                <Text style={[styles.td, { width: 52, textAlign: 'right', fontWeight: 'bold' }]}>
                  {item.total_amount.toFixed(2)}
                </Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={[styles.tableRow, styles.tableTotalRow]}>
              <Text style={[styles.td, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>
                TOTAL:
              </Text>
              <Text style={[styles.td, { width: 32, textAlign: 'center', fontWeight: 'bold' }]}>
                {currentOrder.total_qty}
              </Text>
              <Text style={[styles.td, { width: 44 }]}></Text>
              <Text style={[styles.td, { width: 50, textAlign: 'right', fontWeight: 'bold' }]}>
                ₹{currentOrder.taxable_amount.toFixed(2)}
              </Text>
              <Text style={[styles.td, { width: 34 }]}></Text>
              <Text style={[styles.td, { width: 42, textAlign: 'right', fontWeight: 'bold' }]}>
                ₹{currentOrder.total_gst.toFixed(2)}
              </Text>
              <Text style={[styles.td, { width: 52, textAlign: 'right', fontWeight: 'bold' }]}>
                ₹{(currentOrder.taxable_amount + currentOrder.total_gst).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Category Summary Box */}
          {Object.keys(categoryQtyMap).length > 0 && (
            <View style={styles.catBox}>
              <View style={styles.catBoxHeader}>
                <Text style={styles.catBoxHeaderCell}>CATEGORY</Text>
                {Object.keys(categoryQtyMap).map((cat) => (
                  <Text key={cat} style={styles.catBoxHeaderCell}>
                    {cat.toUpperCase()}
                  </Text>
                ))}
                <Text style={styles.catBoxHeaderCell}>TOTAL</Text>
              </View>
              <View style={styles.catBoxRow}>
                <Text style={styles.catBoxCell}>QTY</Text>
                {Object.keys(categoryQtyMap).map((cat) => (
                  <Text key={cat} style={styles.catBoxCell}>
                    {categoryQtyMap[cat]}
                  </Text>
                ))}
                <Text style={[styles.catBoxCell, { fontWeight: 'bold' }]}>
                  {currentOrder.total_qty}
                </Text>
              </View>
            </View>
          )}

          {/* Tax Summary & Grand Total */}
          <View style={styles.taxSummaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taxBreakupTitle}>Total GST Payable Breakup:</Text>
              <Text style={styles.taxBreakupSub}>
                CGST (2.5%): ₹{currentOrder.cgst_amount.toFixed(2)} &bull; SGST (2.5%): ₹
                {currentOrder.sgst_amount.toFixed(2)} &bull; IGST: ₹0.00
              </Text>
              <Text style={styles.taxBreakupSub}>
                Total GST: ₹{currentOrder.total_gst.toFixed(2)} | Round Off:{' '}
                {currentOrder.round_off >= 0 ? '+' : ''}
                {currentOrder.round_off.toFixed(2)}
              </Text>
              <Text style={styles.inWords}>
                <Text style={{ fontWeight: 'bold' }}>In Words:</Text> {amountInWords}
              </Text>
            </View>

            <View style={styles.grandTotalBox}>
              <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.grandTotalAmount}>
                ₹{currentOrder.grand_total.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Footer & Signatory */}
          <View style={styles.invoiceFooter}>
            <View style={{ flex: 1 }}>
              {COMPANY_DETAILS.terms.map((t, idx) => (
                <Text key={idx} style={styles.termLine}>
                  {t}
                </Text>
              ))}
            </View>
            <View style={styles.signatory}>
              <Text style={styles.signFor}>For, {COMPANY_DETAILS.name}</Text>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>Authorised Signatory</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer Bar */}
      <View style={styles.actionBar}>
        {/* Toggle / Checkbox for Printed Status */}
        <TouchableOpacity
          style={[styles.printCheckRow, isAlreadyPrinted && styles.printCheckRowDone]}
          onPress={handleTogglePrintedStatus}
          disabled={isAlreadyPrinted}
        >
          <View style={[styles.checkbox, isAlreadyPrinted && styles.checkboxChecked]}>
            {isAlreadyPrinted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            {isAlreadyPrinted
              ? 'Already Printed (Saved in History)'
              : 'Mark as Printed (I have taken printout)'}
          </Text>
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtn]}
            onPress={handleShare}
            disabled={isPrinting}
          >
            <Text style={styles.shareBtnText}>📄 Share PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.printBtn]}
            onPress={handlePrint}
            disabled={isPrinting}
          >
            <Text style={styles.printBtnText}>🖨️ Print Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#374151',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F3F4F6',
  },
  emptyText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  backBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topBackBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  topBackBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  topSubtitle: {
    color: '#BFDBFE',
    fontSize: 11,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  printedText: {
    color: '#059669',
  },
  pendingText: {
    color: '#D97706',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 130,
  },
  invoiceDocument: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#111',
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingBottom: 8,
    gap: 10,
  },
  invoiceLogo: {
    width: 60,
    height: 60,
  },
  companyInfo: {
    flex: 1,
    alignItems: 'center',
  },
  taxInvoiceBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.3,
  },
  companyAddr: {
    fontSize: 9.5,
    color: '#222',
  },
  companyPhone: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#000',
  },
  companyRegs: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
  },
  metaBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 8,
  },
  partyCol: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  orderCol: {
    flex: 1,
    padding: 6,
  },
  metaHeading: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  partyName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000',
    marginBottom: 2,
  },
  metaLine: {
    fontSize: 9.5,
    color: '#222',
    lineHeight: 13,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableTotalRow: {
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderBottomWidth: 0,
  },
  td: {
    fontSize: 9,
    color: '#111',
  },
  catBox: {
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 8,
  },
  catBoxHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  catBoxHeaderCell: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 3,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  catBoxRow: {
    flexDirection: 'row',
  },
  catBoxCell: {
    flex: 1,
    fontSize: 8.5,
    textAlign: 'center',
    paddingVertical: 3,
    borderRightWidth: 1,
    borderRightColor: '#000',
  },
  taxSummaryCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    marginTop: 8,
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
  },
  taxBreakupTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  taxBreakupSub: {
    fontSize: 8.5,
    color: '#333',
    marginTop: 1,
  },
  inWords: {
    fontSize: 8.5,
    color: '#1E3A8A',
    fontStyle: 'italic',
    marginTop: 4,
  },
  grandTotalBox: {
    borderWidth: 1.5,
    borderColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minWidth: 110,
  },
  grandTotalLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  grandTotalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
  },
  invoiceFooter: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 6,
  },
  termLine: {
    fontSize: 8,
    color: '#444',
  },
  signatory: {
    alignItems: 'flex-end',
  },
  signFor: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  signLine: {
    width: 90,
    height: 1,
    backgroundColor: '#000',
    marginTop: 24,
    marginBottom: 2,
  },
  signLabel: {
    fontSize: 8.5,
    color: '#333',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  printCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingVertical: 4,
  },
  printCheckRowDone: {
    opacity: 0.7,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  shareBtnText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14,
  },
  printBtn: {
    backgroundColor: '#1E3A8A',
  },
  printBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
