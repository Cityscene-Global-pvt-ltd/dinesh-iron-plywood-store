import { Product, ModalMode } from "./inventory";

export interface SelectedProduct {
  id?: string;
  productId?: string;
  lineId?: string; // unique per-row key so same product can appear multiple times
  name: string;
  size?: string;
  color?: string;
  hsn?: string;
  qty: number;
  price: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  gstAmount?: number;
  priceAfterGst?: number;
  itemDiscPercent: number;
  conversionRate: number;
  basePrice: number;
  unit: string;
  selectedUnit?: string;
  altUnit?: string;
  altUnitConversion?: number;
  isNew?: boolean;
  customInflatedPrice?: number | string;
  priceSource?: "CUSTOMER" | "GLOBAL_LAST" | "INVENTORY";
}
export interface PaymentsData {
  id?: string;
  saleId?: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string;
  paymentDate?: string;
}
export interface Sale {
  id?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  customerAddress?: string;
  saleDate?: string;
  items: SelectedProduct[];
  payments?: PaymentsData[];
  gstType?: string;
  subtotal?: number;
  totalGstAmount?: number;
  amountPaid?: number;
  discount?: number;
  totalAmount: number;
  balance: number;
  paymentStatus?: string;
  saleType?: string;
  invoiceNumber?: string;
  referenceId?: string;
  earnedPoints?: number;
  gstNumber?: string;
  shippingName?: string;
  shippingMobile?: string;
  shippingEmail?: string;
  shippingAddress?: string;
  shippingGst?: string;
  updateType?: string;
  poNumber?: string;
  poDate?: string;
  vehicleNo?: string;
  billNo?: string;
  paymentMode?: string;
  referenceNumber?: string;
  freightCharges: number;
}

export interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Sale) => void;
  products: Product[];
  sale?: Sale;
  existingReturn?: any;
  mode?: ModalMode;
  lastBillNumber?: string;
  billPrefix?: string;
  loading?: boolean;
}
export interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (returnData: any) => void;
  sale?: Sale;
  existingReturn?: any;
  loading?: boolean;
}
