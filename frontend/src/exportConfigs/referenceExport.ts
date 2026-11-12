import { Reference, RedemptionRecord } from "@/types/references";

export const transformReferenceData = (references: Reference[]) => {
  return references.map((r) => {
    const total = Number(r.points || 0);
    const redeemed = Number(r.redeemedPoints || 0);
    return {
      "Reference Number": r.referenceNumber,
      Name: r.name,
      Email: r.email,
      Mobile: r.mobile,
      Address: r.address,
      "Total Points": total,
      "Redeemed Points": redeemed,
      "Available Points": Math.max(0, total - redeemed),
      Status: r.status,
      Remarks: r.remarks ?? "",
    };
  });
};

export const transformRedemptionData = (redemptions: RedemptionRecord[]) => {
  return redemptions.map((r) => ({
    "Redemption Date": r.redemptionDate,
    "Reference Name": r.referenceName || "",
    "Reference Number": r.referenceNumber || "",
    "Mobile": r.referenceMobile || "",
    "Points Redeemed": r.points,
    "Amount Paid (₹)": Number(r.amount || 0),
    "Payment Mode": r.paymentMode,
    "Txn / Cheque No": r.referenceNo || "",
    "Notes": r.notes || "",
    "Processed By": r.createdBy || "",
  }));
};
