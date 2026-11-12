import { formatDate } from "@/utils/dateUtils";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 15,
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  infoBox: { width: "48%" },
  sectionLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  table: {
    display: "flex",
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#111827",
    color: "#ffffff",
    minHeight: 22,
    alignItems: "center",
    fontWeight: "bold",
    fontSize: 8,
    borderWidth: 1,
    borderColor: "#111827",
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
  },
  colName: { width: "30%", paddingLeft: 8 },
  colQty: { width: "10%", textAlign: "center" },
  colRate: { width: "15%", textAlign: "right", paddingRight: 8 },
  colDisc: { width: "10%", textAlign: "center" },
  colGst: { width: "10%", textAlign: "right", paddingRight: 4 },
  colTotal: {
    width: "15%",
    textAlign: "right",
    paddingRight: 8,
    fontWeight: "bold",
  },
  footerSection: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentSection: { width: "55%" },
  paymentTable: { marginTop: 5, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  paymentRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingVertical: 4,
    fontSize: 7,
  },
  pColDate: { width: "25%" },
  pColMethod: { width: "25%" },
  pColRef: { width: "30%" },
  pColAmt: { width: "20%", textAlign: "right", fontWeight: "bold" },
  summaryBox: { width: "40%", flexDirection: "column", alignItems: "flex-end" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    width: "100%",
  },
  summaryLabel: {
    fontSize: 9,
    color: "#4b5563",
    width: 100,
    textAlign: "right",
    paddingRight: 10,
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    width: 70,
    textAlign: "right",
  },
  balanceHighlight: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#111827",
    borderRadius: 4,
    width: 170,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

interface SupplierPDFProps {
  data: any;
  supplier: any;
  orderData?: any;
  type?: "PO" | "BILL";
}

export const SupplierPDFDocument = ({
  data,
  supplier,
  orderData,
  type = "PO",
}: SupplierPDFProps) => {
  const isBill = type === "BILL";
  const source = isBill ? orderData : data;
  const isLocal = source?.gstType === "LOCAL";

  const safeNum = (val: any) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {isBill ? "PURCHASE BILL" : "PURCHASE ORDER"}
            </Text>
            <Text
              style={{
                marginTop: 5,
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {supplier?.name}
            </Text>
            <Text>{supplier?.address || "N/A"}</Text>
            <Text>Mobile: {supplier?.mobile || "N/A"}</Text>
            <Text>Email: {supplier?.email || "N/A"}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontWeight: "bold" }}>
              {isBill ? "Bill #" : "PO #"} :{" "}
              {isBill ? data.billNumber : data.orderNumber}
            </Text>
            <Text>
              Date: {formatDate(isBill ? data.billDate : data.orderDate)}
            </Text>
            {isBill && data.poNumber && (
              <Text style={{ fontSize: 8 }}>Ref PO: {data.poNumber}</Text>
            )}
            {isBill && data.poDate && (
              <Text style={{ fontSize: 8 }}>
                PO Date: {formatDate(data.poDate)}
              </Text>
            )}
            {isBill && data.vehicleNumber && (
              <Text style={{ fontSize: 8 }}>
                Vehicle No: {data.vehicleNumber}
              </Text>
            )}
            {supplier?.gstNumber && <Text>GSTIN: {supplier.gstNumber}</Text>}
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.sectionLabel}>Billing Details (Buyer)</Text>
            <Text style={{ fontWeight: "bold" }}>{source?.billingName}</Text>
            <Text>{source?.billingMobile || "N/A"}</Text>{" "}
            <Text>{source?.billingEmail || "N/A"}</Text>
            <Text>{source?.billingAddress || "N/A"}</Text>
            <Text>GST: {source?.billingGst || "N/A"}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.sectionLabel}>Shipping Details</Text>
            <Text style={{ fontWeight: "bold" }}>{source?.shippingName}</Text>
            <Text>{source?.shippingMobile || "N/A"}</Text>{" "}
            <Text>{source?.shippingEmail || "N/A"}</Text>
            <Text>{source?.shippingAddress || "N/A"}</Text>
            <Text>GST: {source?.shippingGst || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} wrap={false}>
            <Text style={styles.colName}>Item Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colDisc}>Disc%</Text>
            {isLocal ? (
              <>
                <Text style={styles.colGst}>CGST</Text>
                <Text style={styles.colGst}>SGST</Text>
              </>
            ) : (
              <Text style={[styles.colGst, { width: "20%" }]}>IGST</Text>
            )}
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {data.items?.map((item: any, i: number) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <View style={styles.colName}>
                <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                <Text style={{ fontSize: 7, color: "#6b7280" }}>
                  HSN: {item.hsn || "N/A"}
                </Text>
              </View>
              <Text style={styles.colQty}>
                {isBill
                  ? safeNum(item.receivedQty || item.orderedQty)
                  : safeNum(item.qty)}{" "}
                {item.selectedUnit || item.unit || ""}
              </Text>
              <View style={styles.colRate}>
                <Text>{safeNum(item.price).toFixed(2)}</Text>
                <Text style={{ fontSize: 7, color: "#6b7280", marginTop: 2 }}>
                  {safeNum(item.basePrice).toFixed(2)} / {item.selectedUnit || item.unit || "unit"}
                </Text>
              </View>
              <Text style={styles.colDisc}>{safeNum(item.discPercent)}%</Text>
              {isLocal ? (
                <>
                  <Text style={styles.colGst}>{safeNum(item.cgst)}%</Text>
                  <Text style={styles.colGst}>{safeNum(item.sgst)}%</Text>
                </>
              ) : (
                <Text style={[styles.colGst, { width: "20%" }]}>
                  {safeNum(item.igst)}%
                </Text>
              )}
              <Text style={styles.colTotal}>
                {safeNum(item.priceAfterGst).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footerSection} wrap={false}>
          <View style={styles.paymentSection}>
            {isBill && data.payments?.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Payment History</Text>
                <View style={styles.paymentTable}>
                  <View
                    style={[
                      styles.paymentRow,
                      { fontWeight: "bold", backgroundColor: "#f9fafb" },
                    ]}
                  >
                    <Text style={styles.pColDate}>Date</Text>
                    <Text style={styles.pColMethod}>Method</Text>
                    <Text style={styles.pColRef}>Ref No.</Text>
                    <Text style={styles.pColAmt}>Amount</Text>
                  </View>
                  {data.payments.map((p: any, idx: number) => (
                    <View key={idx} style={styles.paymentRow} wrap={false}>
                      <Text style={styles.pColDate}>
                        {formatDate(p.paymentDate)}
                      </Text>
                      <Text style={styles.pColMethod}>{p.method}</Text>
                      <Text style={styles.pColRef}>
                        {p.referenceNumber || "N/A"}
                      </Text>
                      <Text style={styles.pColAmt}>
                        {safeNum(p.amount).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {safeNum(data.subtotal).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax Amount</Text>
              <Text style={styles.summaryValue}>
                {safeNum(data.totalGstAmount || data.totalGst).toFixed(2)}
              </Text>
            </View>
            {isBill && safeNum(data.freightCharges || data.freight) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Freight</Text>
                <Text style={styles.summaryValue}>
                  {safeNum(data.freightCharges || data.freight).toFixed(2)}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.summaryRow,
                {
                  marginTop: 4,
                  paddingTop: 4,
                  borderTopWidth: 1,
                  borderTopColor: "#e5e7eb",
                },
              ]}
            >
              <Text style={[styles.summaryLabel, { fontWeight: "bold" }]}>
                Grand Total
              </Text>
              <Text style={styles.summaryValue}>
                {safeNum(data.totalAmount).toFixed(2)}
              </Text>
            </View>
            {isBill && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Additional Discount (-)
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
                    {safeNum(data.discount).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount Paid</Text>
                  <Text style={[styles.summaryValue, { color: "#059669" }]}>
                    {safeNum(data.amountPaid).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.balanceHighlight}>
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 8,
                      fontWeight: "bold",
                    }}
                  >
                    BALANCE DUE
                  </Text>
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 9,
                      fontWeight: "bold",
                    }}
                  >
                    {safeNum(data.balanceAmount || data.balance).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
