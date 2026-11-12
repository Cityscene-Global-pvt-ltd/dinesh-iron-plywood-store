import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PaymentsData, SelectedProduct } from "@/types/sales";
import { formatDate } from "@/utils/dateUtils";

const styles = StyleSheet.create({
  bodyContainer: {
    marginTop: 15,
    paddingHorizontal: 2,
  },
  table: {
    display: "flex",
    width: "100%",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#111827",
    color: "#ffffff",
    minHeight: 25,
    alignItems: "center",
    textAlign: "center",
    fontSize: 8,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 28,
    alignItems: "center",
    textAlign: "center",
    fontSize: 9,
  },
  colSno: { width: "6%" },
  colDesc: { width: "30%", textAlign: "left", paddingLeft: 8 },
  colQty: { width: "8%", textAlign: "center" },
  colRate: { width: "14%", textAlign: "right", paddingRight: 6 },
  colDisc: { width: "10%", textAlign: "right", paddingRight: 6 },
  colCgst: { width: "8%", textAlign: "right" },
  colSgst: { width: "8%", textAlign: "right" },
  colIgst: { width: "16%", textAlign: "right" },
  colAmount: {
    width: "16%",
    textAlign: "right",
    fontWeight: "bold",
    paddingRight: 6,
  },
  returnContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
    borderRadius: 6,
  },
  returnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#ea580c",
    color: "#ffffff",
    fontSize: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontWeight: "bold",
  },
  returnNo: {
    fontSize: 9,
    fontWeight: "bold",
    marginLeft: 6,
    color: "#9a3412",
  },
  returnDate: { fontSize: 8, color: "#9a3412" },
  miniTable: { marginTop: 5 },
  miniTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
    paddingBottom: 3,
    marginBottom: 3,
  },
  miniTableRow: { flexDirection: "row", paddingVertical: 2 },
  miniColItem: { flex: 2, fontSize: 8, color: "#9a3412" },
  miniColQty: { flex: 1, fontSize: 8, textAlign: "right", color: "#9a3412" },
  miniColRefund: {
    flex: 1,
    fontSize: 8,
    textAlign: "right",
    fontWeight: "bold",
    color: "#9a3412",
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
    marginVertical: 6,
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between" },
  creditTotalLabel: { fontSize: 9, fontWeight: "bold", color: "#9a3412" },
  creditTotalValue: { fontSize: 10, fontWeight: "bold", color: "#ea580c" },
  remarks: { fontSize: 7, fontStyle: "italic", color: "#9a3412", marginTop: 4 },
  totalsContainer: {
    marginTop: 20,
    flexDirection: "column",
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    width: "100%",
  },
  totalLabel: {
    fontSize: 9,
    color: "#4b5563",
    width: 120,
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
    width: 80,
    textAlign: "right",
  },
  balanceHighlight: {
    marginTop: 14,
    padding: 6,
    backgroundColor: "#111827",
    borderRadius: 4,
    width: 180,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentContainer: {
    marginTop: 15,
    padding: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#dcfce7",
    borderRadius: 6,
  },
  paymentHeader: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#bbf7d0",
    paddingBottom: 2,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  paymentText: {
    fontSize: 8,
    color: "#166534",
  },
  paymentAmount: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#15803d",
  },
});

interface BodyProps {
  items: SelectedProduct[];
  returns: any[];
  gstType: "LOCAL" | "INTERSTATE" | "NONE";
  subtotal: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  gstAmount: number;
  totalReturned: number;
  payments: PaymentsData[];
  freight: number;
}

const Body: React.FC<BodyProps> = ({
  items,
  returns,
  gstType,
  subtotal,
  discount,
  totalAmount,
  amountPaid,
  balance,
  gstAmount,
  totalReturned,
  payments,
  freight,
}) => {
  return (
    <View style={styles.bodyContainer}>
      <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 8 }}>
        BILLING DETAILS
      </Text>

      <View style={styles.table}>
        <View style={styles.tableHeader} wrap={false}>
          <Text style={styles.colSno}>S.No</Text>
          <Text style={styles.colDesc}>Item & hsn</Text>
          <Text style={styles.colQty}>Qty</Text>
          <View style={styles.colRate}>
            <Text>Rate (After Disc)</Text>
          </View>
          <Text style={styles.colDisc}>Disc (%)</Text>
          {gstType === "INTERSTATE" && <Text style={styles.colIgst}>IGST</Text>}
          {gstType === "LOCAL" && (
            <>
              <Text style={styles.colCgst}>CGST</Text>
              <Text style={styles.colSgst}>SGST</Text>
            </>
          )}
          <Text style={styles.colAmount}>Total</Text>
        </View>

        {items?.map((item, index) => (
          <View style={styles.tableRow} key={index} wrap={false}>
            <Text style={styles.colSno}>{index + 1}</Text>
            <View style={styles.colDesc}>
              <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
              <Text style={{ fontSize: 7, color: "#6b7280" }}>
                HSN: {item.hsn}
              </Text>
            </View>
            <Text style={styles.colQty}>
              {item.qty} {item.selectedUnit || item.unit || ""}
            </Text>
            <View style={styles.colRate}>
              <Text style={{ textAlign: "right" }}>
                {Number(item.price || 0).toFixed(2)}
              </Text>
              <Text
                style={{ textAlign: "right", fontSize: 7, color: "#6b7280" }}
              >
                {Number(item.basePrice || 0).toFixed(2)} / {item.selectedUnit || item.unit}
              </Text>
            </View>
            <Text style={styles.colDisc}>
              {Number(item.itemDiscPercent || 0)}
            </Text>
            {gstType === "INTERSTATE" && (
              <Text style={styles.colIgst}>{Number(item.igst || 0)}%</Text>
            )}
            {gstType === "LOCAL" && (
              <>
                <Text style={styles.colCgst}>{Number(item.cgst || 0)}%</Text>
                <Text style={styles.colSgst}>{Number(item.sgst || 0)}%</Text>
              </>
            )}
            <Text style={styles.colAmount}>
              {Number(item.priceAfterGst || 0).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {returns?.map((r: any, index: number) => (
        <View key={index} style={styles.returnContainer} wrap={false}>
          <View style={styles.returnHeader}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.badge}>RETURN</Text>
              <Text style={styles.returnNo}>
                #{r.returnNumber || r.returnNo}
              </Text>
            </View>
            <Text style={styles.returnDate}>
              {new Date(r.returnDate).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.miniTable}>
            {r.items?.map((item: any, idx: number) => (
              <View key={idx} style={styles.miniTableRow} wrap={false}>
                <Text style={styles.miniColItem}>
                  {item.itemName || item.name}
                </Text>
                <Text style={styles.miniColQty}>
                  x{item.returnQty} {item.selected_unit || item.unit || ""}
                </Text>
                <Text style={styles.miniColRefund}>
                  Rs. {Number(item.priceAfterGst || 0).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.separator} />

          <View style={{ gap: 2, marginBottom: 4 }}>
            <View style={styles.footerRow}>
              <Text style={{ fontSize: 7, color: "#9a3412" }}>
                Total Return Amount:
              </Text>
              <Text style={{ fontSize: 7, color: "#9a3412" }}>
                Rs. {Number(r.totalAmount || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.footerRow}>
              <Text style={{ fontSize: 7, color: "#dc2626" }}>
                Discount Adjusted (-):
              </Text>
              <Text style={{ fontSize: 7, color: "#dc2626" }}>
                Rs. {Number(r.discountApplied || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.footerRow,
              { borderTopWidth: 0.5, borderTopColor: "#fed7aa", paddingTop: 4 },
            ]}
          >
            <Text style={styles.creditTotalLabel}>Net Refundable:</Text>
            <Text style={styles.creditTotalValue}>
              Rs. {Number(r.netRefund || 0).toFixed(2)}
            </Text>
          </View>

          {r.remarks && <Text style={styles.remarks}>* {r.remarks}</Text>}
        </View>
      ))}

      {payments && payments.length > 0 && (
        <View style={styles.paymentContainer} wrap={false}>
          <Text style={styles.paymentHeader}>TRANSACTION HISTORY</Text>
          {payments.map((p: any, idx: number) => (
            <View key={idx} style={styles.paymentRow}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Text style={styles.paymentText}>
                  {formatDate(p.paymentDate)}
                </Text>
                <Text style={styles.paymentText}>
                  {p.paymentMode}{" "}
                  {p.referenceNumber ? `(${p.referenceNumber})` : ""}
                </Text>
              </View>
              <Text style={styles.paymentAmount}>
                Rs. {Number(p.amount || 0).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.totalsContainer} wrap={false}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {Number(subtotal || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax Amount</Text>
          <Text style={styles.totalValue}>
            {Number(gstAmount || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Freight</Text>
          <Text style={styles.totalValue}>
            {Number(freight || 0).toFixed(2)}
          </Text>
        </View>

        <View
          style={[
            styles.totalRow,
            {
              marginTop: 4,
              paddingTop: 4,
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
            },
          ]}
        >
          <Text style={[styles.totalLabel, { fontWeight: "bold" }]}>
            Net Payable
          </Text>
          <Text style={styles.totalValue}>
            Rs. {Number(totalAmount || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Additional Discount</Text>
          <Text style={[styles.totalValue, { color: "#dc2626" }]}>
            {Number(discount || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount Received</Text>
          <Text style={[styles.totalValue, { color: "#059669" }]}>
            {Number(amountPaid || 0).toFixed(2)}
          </Text>
        </View>
        {totalReturned > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Refund</Text>
            <Text style={styles.totalValue}>
              {Number(totalReturned || 0).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.balanceHighlight}>
          <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "bold" }}>
            {balance < 0 ? "REFUND TO CUSTOMER" : "BALANCE DUE"}
          </Text>
          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>
            Rs. {Math.abs(Number(balance || 0)).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Body;
