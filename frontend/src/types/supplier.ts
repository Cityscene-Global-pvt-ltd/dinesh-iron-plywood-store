export interface Payment {
  id?: string;
  paymentDate: string;
  amount: number;
  method: string;
  remarks?: string;
  referenceNumber?: string;
}

export interface SupplierOrderTransport {
  transportName?: string;
  transportContact?: string;
  lrNumber?: string;
  transportMode?: "ROAD" | "RAIL" | "AIR" | "SEA" | "COURIER";
  expectedDeliveryDate?: string;
  freightAmount?: number;
  transportNotes?: string;
}

export interface SupplierOrder extends SupplierOrderTransport {
  id?: string;
  supplierId: string;
  orderNumber: string;
  orderDate: string;
  orderType?: "PAKKA" | "KACCHA";
  billingName?: string;
  billingEmail?: string;
  billingMobile?: string;
  billingAddress?: string;
  billingGst?: string;
  shippingName?: string;
  shippingEmail?: string;
  shippingMobile?: string;
  shippingAddress?: string;
  shippingGst?: string;
  gstType?: "LOCAL" | "INTERSTATE" | "NONE";
  subtotal: number;
  totalGstAmount: number;
  totalAmount: number;
  isBilled?: boolean;
  items?: any[];
}

export interface Supplier {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  pan: string;
  gstNumber: string;
  openingBalance?: number;
  orders?: any[];
  bills?: any[];
  payments?: any[];
  type?: string;
}
