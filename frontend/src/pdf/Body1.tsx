import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { PaymentsData, SelectedProduct } from "@/types/sales";
import { formatDate } from "@/utils/dateUtils";

const modernStyles = StyleSheet.create({
  container: {
    marginTop: 20,
    paddingHorizontal: 5,
  },
  gridHeader: {
    flexDirection: "row",
    backgroundColor: "#111827",
    padding: 8,
    borderRadius: 4,
  },
  headerText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  productRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  colMain: { flex: 3 },
  colQty: { flex: 0.8, textAlign: "center" },
  colRate: { flex: 1.2, textAlign: "right" },
  colDisc: { flex: 1, textAlign: "right" },
  colTax: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1.2, textAlign: "right" },

  infoSection: {
    flexDirection: "row",
    marginTop: 25,
    gap: 20,
  },
  leftPanel: {
    flex: 1.2,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  statusBadge: {
    padding: 6,
    borderRadius: 4,
    marginBottom: 10,
    textAlign: "center",
  },
  returnItem: {
    fontSize: 7,
    color: "#4b5563",
    padding: 4,
    backgroundColor: "#fff7ed",
    borderLeftWidth: 2,
    borderLeftColor: "#fb923c",
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },
  grandTotalContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceBox: {
    marginTop: 12,
    padding: 8,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentItem: {
    fontSize: 7,
    color: "#065f46",
    padding: 4,
    backgroundColor: "#ecfdf5",
    borderLeftWidth: 2,
    borderLeftColor: "#10b981",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 6,
    marginTop: 10,
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

const Body1: React.FC<BodyProps> = ({
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
    <View style={modernStyles.container}>
      <View style={modernStyles.gridHeader} wrap={false}>
        <Text style={[modernStyles.colMain, modernStyles.headerText]}>
          Item Description
        </Text>
        <Text style={[modernStyles.colQty, modernStyles.headerText]}>Qty</Text>
        <Text style={[modernStyles.colRate, modernStyles.headerText]}>
          Price
        </Text>
        <Text style={[modernStyles.colDisc, modernStyles.headerText]}>
          Disc (%)
        </Text>
        {gstType !== "NONE" && (
          <Text style={[modernStyles.colTax, modernStyles.headerText]}>
            Tax
          </Text>
        )}
        <Text style={[modernStyles.colTotal, modernStyles.headerText]}>
          Total
        </Text>
      </View>

      {items?.map((item, index) => (
        <View key={index} style={modernStyles.productRow} wrap={false}>
          <View style={modernStyles.colMain}>
            <Text style={{ fontSize: 10, fontWeight: "bold" }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: 7, color: "#9ca3af", marginTop: 2 }}>
              {item.hsn}
            </Text>
          </View>
          <Text style={[modernStyles.colQty, { fontSize: 10 }]}>
            {item.qty} {item.selectedUnit || item.unit || ""}
          </Text>
          <View style={modernStyles.colRate}>
            <Text style={{ fontSize: 10 }}>
              {Number(item.price || 0).toFixed(2)}
            </Text>
            <Text style={{ fontSize: 7, color: "#9ca3af" }}>
              {Number(item.basePrice || 0).toFixed(2)} / {item.selectedUnit || item.unit}
            </Text>
          </View>
          <Text
            style={[
              modernStyles.colDisc,
              { fontSize: 10, textAlign: "center" },
            ]}
          >
            {Number(item.itemDiscPercent || 0)}
          </Text>
          {gstType !== "NONE" && (
            <Text style={[modernStyles.colTax, { fontSize: 9 }]}>
              {gstType === "LOCAL"
                ? Number(item.cgst || 0) + Number(item.sgst || 0)
                : Number(item.igst || 0)}
              %
            </Text>
          )}
          <Text
            style={[
              modernStyles.colTotal,
              { fontSize: 10, fontWeight: "bold" },
            ]}
          >
            {Number(item.priceAfterGst || 0).toFixed(2)}
          </Text>
        </View>
      ))}

      <View style={modernStyles.infoSection}>
        <View style={modernStyles.leftPanel}>
          <View
            style={[
              modernStyles.statusBadge,
              { backgroundColor: balance <= 0 ? "#ecfdf5" : "#fef2f2" },
            ]}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "bold",
                color: balance <= 0 ? "#059669" : "#dc2626",
              }}
            >
              {balance <= 0 ? "PAYMENT COMPLETED" : "PAYMENT PENDING"}
            </Text>
          </View>

          {payments && payments.length > 0 && (
            <View>
              <Text style={modernStyles.sectionTitle}>TRANSACTION HISTORY</Text>
              {payments.map((p, i) => (
                <View key={i} style={modernStyles.paymentItem} wrap={false}>
                  <Text>
                    {formatDate(p.paymentDate)} | {p.paymentMode} | Rs.{" "}
                    {Number(p.amount || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {returns && returns.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={modernStyles.sectionTitle}>RETURN HISTORY</Text>
              {returns.map((r, i) => (
                <View key={i} style={modernStyles.returnItem} wrap={false}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ fontWeight: "bold" }}>
                      #{r.returnNumber}
                    </Text>
                    <Text style={{ fontSize: 6, color: "#9a3412" }}>
                      {new Date(r.returnDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ marginTop: 2, gap: 1 }}>
                    <Text style={{ fontSize: 6.5 }}>
                      Total Amt: Rs. {Number(r.totalAmount || 0).toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 6.5, color: "#dc2626" }}>
                      Disc. Adj: -Rs.{" "}
                      {Number(r.discountApplied || 0).toFixed(2)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 7,
                        fontWeight: "bold",
                        color: "#ea580c",
                        marginTop: 1,
                        borderTopWidth: 0.2,
                        borderTopColor: "#fb923c",
                        paddingTop: 1,
                      }}
                    >
                      Net Refund: Rs. {Number(r.netRefund || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={modernStyles.rightPanel} wrap={false}>
          <View style={modernStyles.summaryRow}>
            <Text style={modernStyles.summaryLabel}>Subtotal</Text>
            <Text style={modernStyles.summaryValue}>
              {Number(subtotal || 0).toFixed(2)}
            </Text>
          </View>
          <View style={modernStyles.summaryRow}>
            <Text style={modernStyles.summaryLabel}>GST Tax</Text>
            <Text style={modernStyles.summaryValue}>
              {Number(gstAmount || 0).toFixed(2)}
            </Text>
          </View>
          <View style={modernStyles.summaryRow}>
            <Text style={modernStyles.summaryLabel}>Freight</Text>
            <Text style={modernStyles.summaryValue}>
              {Number(freight || 0).toFixed(2)}
            </Text>
          </View>
          <View style={modernStyles.grandTotalContainer}>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>
              Net Payable
            </Text>
            <Text style={{ fontSize: 11, fontWeight: "bold" }}>
              Rs. {Number(totalAmount || 0).toFixed(2)}
            </Text>
          </View>
          <View style={[modernStyles.summaryRow, { marginTop: 8 }]}>
            <Text style={modernStyles.summaryLabel}>Discount</Text>
            <Text style={[modernStyles.summaryValue, { color: "#dc2626" }]}>
              {Number(discount || 0).toFixed(2)}
            </Text>
          </View>
          <View style={modernStyles.summaryRow}>
            <Text style={modernStyles.summaryLabel}>Received</Text>
            <Text style={[modernStyles.summaryValue, { color: "#059669" }]}>
              {Number(amountPaid || 0).toFixed(2)}
            </Text>
          </View>
          {totalReturned > 0 && (
            <View style={modernStyles.summaryRow}>
              <Text style={modernStyles.summaryLabel}>Total Refund</Text>
              <Text style={modernStyles.summaryValue}>
                {Number(totalReturned || 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View
            style={[
              modernStyles.balanceBox,
              { backgroundColor: balance >= 0 ? "#111827" : "#059669" },
            ]}
          >
            <Text style={{ fontSize: 9, color: "#ffffff", fontWeight: "bold" }}>
              {balance < 0 ? "REFUND TO CUSTOMER" : "DUE BALANCE"}
            </Text>
            <Text
              style={{ fontSize: 10, color: "#ffffff", fontWeight: "bold" }}
            >
              Rs. {Math.abs(Number(balance || 0)).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Body1;
