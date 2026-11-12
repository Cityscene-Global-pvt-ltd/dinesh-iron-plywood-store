export interface Product {
  id?: string;
  name: string;
  hsn: string;
  category: string;
  type: string;
  unit: string;
  altUnit?: string;
  altUnitConversion?: number;
  size: string;
  color: string;
  availableStock: number;
  buyingPrice: number;
  sellingPrice: number;
  inventoryType?: string;
  conversionRate: number;
  lastSoldPrice?: number;
}

export type ModalMode = "add" | "view" | "edit";

export interface InventoryTableProps {
  products: Product[];
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  activeTab?: string;
}

export interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Product) => void;
  product?: Product;
  mode?: ModalMode;
}
