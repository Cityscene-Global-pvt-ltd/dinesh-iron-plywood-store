export interface Reference {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  address: string;
  points?: number;
  referenceNumber?: string;
  redeemedPoints?: number;
  status?: string;
  remarks?: string;
}

export interface RedemptionRecord {
  id: string;
  referenceId: string;
  referenceName?: string;
  referenceNumber?: string;
  referenceMobile?: string;
  points: number;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  notes?: string;
  redemptionDate: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Reference) => void;
  reference?: Reference;
  mode?: "add" | "edit" | "view";
}

export interface ReferenceTableProps {
  references: Reference[];
  onView: (ref: Reference) => void;
  onEdit: (ref: Reference) => void;
  onDelete: (ref: Reference) => void;
  onRedeem: (ref: Reference) => void;
  onHistory: (ref: Reference) => void;
  isLoading: boolean;
}

export interface RedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: Reference | null;
  onSuccess?: () => void;
}

export interface RedemptionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reference: Reference | null;
}
