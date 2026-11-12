import {
  Input,
  Stack,
  Grid,
  Field,
  createListCollection,
  Table,
  IconButton,
  Box,
  HStack,
  Text,
  VStack,
  Separator,
  Badge,
  Flex,
} from "@chakra-ui/react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomTable } from "../ui/CustomTable";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { SelectedProduct, SalesModalProps } from "@/types/sales";
import { MdDelete, MdEdit } from "react-icons/md";

// Polyfill: crypto.randomUUID() only works in HTTPS/localhost (secure contexts).
// Falls back to a Math.random-based UUID v4 for plain HTTP deployments.
const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 compliant fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import { toast } from "@/utils/toast";
import { useGetReferencesQuery, useGetCustomersQuery, useLazyGetCustomerItemPricesQuery } from "@/store/apiSlice";
import { Button } from "../ui/button";
import { getISTDateString, formatDate } from "@/utils/dateUtils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Checkbox } from "../ui/checkbox";

export const SalesModal = ({
  isOpen,
  onClose,
  onSubmit,
  products,
  sale,
  existingReturn,
  lastBillNumber,
  mode: initialMode = "add",
  billPrefix = "INV-",
  loading,
}: SalesModalProps) => {
  const { referralPercent, priceInflationPercent } = useSystemSettings();
  const { data: references = [] } = useGetReferencesQuery();
  const { data: allCustomers = [] } = useGetCustomersQuery();
  const [fetchCustomerPrices] = useLazyGetCustomerItemPricesQuery();
  // { [productId]: lastPrice } – loaded when a customer is selected
  const [customerItemPrices, setCustomerItemPrices] = useState<Record<string, number>>({});
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [gstType, setGstType] = useState<"LOCAL" | "INTERSTATE" | "NONE">(
    "LOCAL",
  );
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [discountType, setDiscountType] = useState<"amount" | "percentage">(
    "amount",
  );

  const [customerData, setCustomerData] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerMobile: "",
    customerAddress: "",
    saleDate: getISTDateString(new Date()),
    gstNumber: "",
    shippingName: "",
    shippingMobile: "",
    shippingEmail: "",
    shippingAddress: "",
    shippingGst: "",
    poNumber: "",
    poDate: getISTDateString(new Date()),
    vehicleNo: "",
    billNo: "",
  });
  const [paymentData, setPaymentData] = useState({
    discount: 0,
    amountPaid: 0,
    balance: 0,
    paymentMode: "CASH",
    referenceNumber: "",
  });
  const [selectedItems, setSelectedItems] = useState<SelectedProduct[]>([]);
  const [selectedReferenceId, setSelectedReferenceId] = useState("");
  const [refSearch, setRefSearch] = useState("");
  const [isShippingSame, setIsShippingSame] = useState(false);
  const [billMode, setBillMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [freightCharges, setFreightCharges] = useState<number>(0);
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DRAFT_KEY = "salesModalDraft";

  const isView = currentMode === "view";
  const isEdit = currentMode === "edit";

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, isOpen]);

  const paymentMethods = createListCollection({
    items: [
      { label: "Cash", value: "CASH" },
      { label: "Bank Transfer", value: "BANK_TRANSFER" },
      { label: "UPI", value: "UPI" },
      { label: "Cheque", value: "CHEQUE" },
    ],
  });

  const generateNextBillNo = (lastBill?: string) => {
    if (!lastBill) return "";

    const match = lastBill.match(/^(.*?)(\d+)$/);

    if (match && match[2]) {
      const prefix = match[1] || billPrefix;
      const numberStr = match[2];
      const nextNumber = (parseInt(numberStr, 10) + 1).toString();
      const formattedNumber = nextNumber.padStart(numberStr.length, "0");

      return prefix + formattedNumber;
    }

    return "";
  };

  useEffect(() => {
    if (sale && isOpen) {
      setCustomerData({
        customerId: sale.customerId || "",
        customerName: sale.customerName || "",
        customerEmail: sale.customerEmail || "",
        customerMobile: sale.customerMobile || "",
        customerAddress: sale.customerAddress || "",
        saleDate: getISTDateString(sale.saleDate),
        gstNumber: sale.gstNumber || "",
        shippingName: sale.shippingName || "",
        shippingMobile: sale.shippingMobile || "",
        shippingEmail: sale.shippingEmail || "",
        shippingAddress: sale.shippingAddress || "",
        shippingGst: sale.shippingGst || "",
        poNumber: sale.poNumber || "",
        poDate: sale.poDate || "",
        vehicleNo: sale.vehicleNo || "",
        billNo: sale.invoiceNumber || "",
      });
      // Ensure every item has a lineId for row-level identity
      setSelectedItems(
        (sale.items || []).map((item: any) => ({
          ...item,
          lineId: item.lineId || generateUUID(),
        }))
      );
      setGstType((sale.gstType as any) || "LOCAL");
      setSelectedReferenceId(sale?.referenceId ? sale?.referenceId : "");
      setPaymentData({
        discount: sale.discount || 0,
        amountPaid: sale.amountPaid || 0,
        balance: sale.balance,
        paymentMode:
          (sale.payments && sale?.payments[0]?.paymentMode) || "CASH",
        referenceNumber:
          (sale.payments && sale?.payments[0]?.referenceNumber) || "",
      });
      setFreightCharges(sale.freightCharges || 0);

      const isSame =
        sale.shippingName === sale.customerName && sale.shippingName !== "";
      setIsShippingSame(isSame);
    } else if (isOpen) {
      // Try to restore draft from localStorage
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setCustomerData(draft.customerData);
          setSelectedItems(draft.selectedItems || []);
          setGstType(draft.gstType || "LOCAL");
          setPaymentData(draft.paymentData || { discount: 0, amountPaid: 0, balance: 0, paymentMode: "CASH", referenceNumber: "" });
          setSelectedReferenceId(draft.selectedReferenceId || "");
          setFreightCharges(draft.freightCharges || 0);
          setBillMode(draft.billMode || "AUTO");
          setIsShippingSame(draft.isShippingSame || false);
          toast.info("Draft restored from your previous session.");
        } catch {
          localStorage.removeItem(DRAFT_KEY);
        }
      } else {
        const generatedBill = generateNextBillNo(lastBillNumber) || `${billPrefix}${Date.now()}`;
        setCustomerData({
          customerId: "",
          customerName: "",
          customerEmail: "",
          customerMobile: "",
          customerAddress: "",
          saleDate: getISTDateString(new Date()),
          gstNumber: "",
          shippingName: "",
          shippingMobile: "",
          shippingEmail: "",
          shippingAddress: "",
          shippingGst: "",
          poNumber: "",
          poDate: getISTDateString(new Date()),
          vehicleNo: "",
          billNo: generatedBill,
        });
        setIsShippingSame(false);
        setSelectedItems([]);
        setGstType("LOCAL");
        setPaymentData({
          discount: 0,
          amountPaid: 0,
          balance: 0,
          paymentMode: "CASH",
          referenceNumber: "",
        });
        setBillMode(generateNextBillNo(lastBillNumber) ? "MANUAL" : "AUTO");
      }
    }
  }, [sale, isOpen]);

  // Auto-save draft to localStorage (only for new sales, debounced)
  useEffect(() => {
    if (!isOpen || sale || isView || isEdit) return;

    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      const draft = {
        customerData,
        selectedItems,
        gstType,
        paymentData,
        selectedReferenceId,
        freightCharges,
        billMode,
        isShippingSame,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 800);

    return () => {
      if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current);
    };
  }, [isOpen, sale, isView, isEdit, customerData, selectedItems, gstType, paymentData, selectedReferenceId, freightCharges, billMode, isShippingSame]);

  // Clear draft on successful submit
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  useEffect(() => {
    if (isOpen && isShippingSame && !isView) {
      setCustomerData((prev) => ({
        ...prev,
        shippingName: prev.customerName,
        shippingMobile: prev.customerMobile,
        shippingEmail: prev.customerEmail,
      }));
    } else if (isOpen && !isShippingSame && !sale && !isView) {
      setCustomerData((prev) => ({
        ...prev,
        shippingName: "",
        shippingMobile: "",
        shippingEmail: "",
        shippingGst: "",
        shippingAddress: "",
      }));
    }
  }, [isShippingSame, isOpen, isView]);

  // Fetch customer-specific price history when customer changes
  useEffect(() => {
    if (customerData.customerId && !isView) {
      fetchCustomerPrices(customerData.customerId)
        .unwrap()
        .then((prices) => {
          setCustomerItemPrices(prices);
          // If items were already added, update unedited ones with this customer's price
          setSelectedItems((prevItems) =>
            prevItems.map((item) => {
              if (item.customInflatedPrice !== undefined && item.customInflatedPrice !== "") {
                return item;
              }
              const prodId = item.productId || item.id;
              if (prodId && prices[prodId] !== undefined) {
                const customerPrice = Number(prices[prodId]);
                return getCalculatedItem(
                  {
                    ...item,
                    basePrice: customerPrice,
                    originalBasePrice: customerPrice,
                    priceSource: "CUSTOMER",
                  },
                  gstType,
                  selectedReferenceId,
                  priceInflationPercent,
                );
              }
              return item;
            }),
          );
        })
        .catch(() => {
          setCustomerItemPrices({});
        });
    } else if (!customerData.customerId) {
      setCustomerItemPrices({});
    }
  }, [customerData.customerId, isView, gstType, selectedReferenceId, priceInflationPercent]);

  useEffect(() => {
    if (selectedItems.length > 0 && !isView) {
      setSelectedItems((prevItems) =>
        prevItems.map((item) => {
          if (currentMode === "edit" && !item.isNew) {
            return item;
          }
          if (currentMode === "edit" && !item.isNew) {
            return item;
          }
          return getCalculatedItem(
            item,
            gstType,
            selectedReferenceId,
            priceInflationPercent,
          );
        }),
      );
    }
  }, [selectedReferenceId, priceInflationPercent, gstType, currentMode]);

  const filteredProducts = useMemo(
    () =>
      (products || []).filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.hsn.includes(productSearch),
      ),
    [products, productSearch],
  );

  const totalReturnAmount = existingReturn.reduce(
    (sum: any, r: any) => sum + Number(r.netRefund || 0),
    0,
  );

  const productCollection = createListCollection({
    items: filteredProducts.map((p) => ({
      label: p.name || "Unknown",
      value: p.id || "",
      size: p.size || "",
      color: p.color || "",
      hsn: p.hsn || "",
      unit: p.unit || "",
      altUnit: p.altUnit || "",
    })),
  });

  const gstTypeCollection = createListCollection({
    items: [
      { label: "No GST", value: "NONE" },
      { label: "Local (CGST + SGST)", value: "LOCAL" },
      { label: "Interstate (IGST)", value: "INTERSTATE" },
    ],
  });

  const calculateTotals = (items: any[]) => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.qty),
      0,
    );
    const totalGst = items.reduce(
      (sum, item) => sum + (Number(item.gstAmount) || 0),
      0,
    );
    return { subtotal, totalAmount: subtotal + totalGst, totalGst };
  };

  const { subtotal, totalGst, totalAmount, grossTotal, balance } =
    useMemo(() => {
      const totals = calculateTotals(selectedItems);
      const itemsTotal = totals.totalAmount;
      const gross = itemsTotal + Number(freightCharges || 0);
      const finalTotalAmount = Math.round(itemsTotal);
      const finalGross = Math.round(gross);

      const bal =
        finalGross -
        (Number(paymentData.discount) || 0) -
        (Number(paymentData.amountPaid) || 0);

      const finalBal = Math.round(bal);

      return {
        subtotal: totals.subtotal,
        totalGst: totals.totalGst,
        totalAmount: finalTotalAmount,
        grossTotal: finalGross,
        balance: finalBal,
      };
    }, [
      selectedItems,
      freightCharges,
      paymentData.discount,
      paymentData.amountPaid,
    ]);

  const getCalculatedItem = (
    item: any,
    gstType: string,
    currentRefId: string,
    currentInflation: number,
  ) => {
    const qty = Number(item.qty) || 0;
    const cRate = Number(item.conversionRate) || 1;
    const bPrice = Number(item.originalBasePrice || item.basePrice) || 0;
    const discPercent = Number(item.itemDiscPercent) || 0;

    const inflationRate = currentRefId ? Number(currentInflation) : 0;
    const computedInflatedPrice = bPrice + (bPrice * inflationRate) / 100;
    
    // Use user-defined inflated price if provided, otherwise compute it
    const inflatedPrice = item.customInflatedPrice !== undefined && item.customInflatedPrice !== ""
      ? Number(item.customInflatedPrice)
      : computedInflatedPrice;

    // Apply alt unit conversion to price when alt unit is selected
    const altUnitMultiplier = (item.selectedUnit && item.altUnit && item.altUnitConversion && item.selectedUnit === item.altUnit)
      ? Number(item.altUnitConversion)
      : 1;

    const priceBeforeDisc = inflatedPrice * cRate * altUnitMultiplier;
    const finalPrice = priceBeforeDisc - (priceBeforeDisc * discPercent) / 100;
    const taxable = finalPrice * qty;

    const totalGstRate =
      gstType === "LOCAL"
        ? Number(item.cgst || 0) + Number(item.sgst || 0)
        : Number(item.igst || 0);

    const gstAmount = (taxable * totalGstRate) / 100;

    return {
      ...item,
      originalBasePrice: bPrice,
      basePrice: inflatedPrice,
      price: finalPrice,
      gstAmount: gstAmount,
      priceAfterGst: taxable + gstAmount,
    };
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // ── 3-Tier price selection ──────────────────────────────────
    // Tier 1: Customer's last price for this exact product
    // Tier 2: Last price this product was sold to anyone (global)
    // Tier 3: Inventory default selling price
    let effectiveBasePrice = Number(product.sellingPrice) || 0;
    let priceSource: "CUSTOMER" | "GLOBAL_LAST" | "INVENTORY" = "INVENTORY";
    if (customerData.customerId && product.id && customerItemPrices[product.id] !== undefined) {
      effectiveBasePrice = Number(customerItemPrices[product.id]);
      priceSource = "CUSTOMER";
    } else if (product.lastSoldPrice && Number(product.lastSoldPrice) > 0) {
      effectiveBasePrice = Number(product.lastSoldPrice);
      priceSource = "GLOBAL_LAST";
    }
    // ────────────────────────────────────────────────────────────

    const lineId = generateUUID(); // unique key for this row (polyfill-safe)
    const initialItem = {
      id: product.id,
      productId: product.id,
      lineId,
      name: product.name || "Unknown Product",
      hsn: product.hsn || "",
      size: product.size || "",
      color: product.color || "",
      qty: 1,
      basePrice: effectiveBasePrice,
      originalBasePrice: effectiveBasePrice,
      priceSource,
      conversionRate: product.conversionRate || 1,
      itemDiscPercent: 0,
      unit: product.unit || "unit",
      selectedUnit: product.unit || "unit",
      altUnit: product.altUnit || "",
      altUnitConversion: product.altUnitConversion || 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      isNew: true,
    };

    const calculatedItem = getCalculatedItem(
      initialItem,
      gstType,
      selectedReferenceId,
      priceInflationPercent,
    );
    setSelectedItems([...selectedItems, calculatedItem]);
  };

  const updateItem = (lineId: string, updates: any) => {
    setSelectedItems((prev) => {
      const index = prev.findIndex((item) => item.lineId === lineId);
      if (index === -1) return prev;

      const updated = [...prev];
      let item = { ...updated[index], ...updates };

      if (
        "itemDiscPercent" in updates &&
        Number(updates.itemDiscPercent) > 100
      ) {
        toast.warning("Discount cannot exceed 100%");
        item.itemDiscPercent = 100;
      }

      updated[index] = getCalculatedItem(
        item,
        gstType,
        selectedReferenceId,
        priceInflationPercent,
      );
      return updated;
    });
  };

  const columns = [
    { label: "Product", align: "start" as const },
    { label: "Unit", align: "start" as const },
    { label: "Qty", align: "start" as const },
    { label: "Rate (After Disc)", align: "center" as const },
    { label: "Disc (%)", align: "start" as const },
    ...(gstType !== "NONE" && !isView && !isEdit
      ? [{ label: "GST (%)", align: "start" as const }]
      : []),
    ...(gstType === "LOCAL"
      ? [
          { label: "CGST (%)", align: "start" as const },
          { label: "SGST (%)", align: "start" as const },
        ]
      : gstType === "INTERSTATE"
        ? [{ label: "IGST (%)", align: "start" as const }]
        : []),
    { label: "Total", align: "end" as const },
    ...(!isView ? [{ label: "Action", align: "center" as const }] : []),
  ];

  const referenceCollection = useMemo(() => {
    const filtered = references.filter(
      (ref: any) =>
        ref.name?.toLowerCase().includes(refSearch.toLowerCase()) ||
        ref.referenceNumber?.toLowerCase().includes(refSearch.toLowerCase()) ||
        ref.mobile?.includes(refSearch),
    );

    return createListCollection({
      items: filtered.map((ref: any) => ({
        label: ref.name,
        value: ref.id,
        refNo: ref.referenceNumber,
        mobile: ref.mobile,
      })),
    });
  }, [references, refSearch]);

  const earnedPoints = selectedReferenceId
    ? Math.round((Number(totalAmount) * Number(referralPercent)) / 100)
    : 0;

  const gstRateCollection = createListCollection({
    items: [
      { label: "5%", value: "5" },
      { label: "9%", value: "9" },
      { label: "18%", value: "18" },
    ],
  });

  const handlePaymentInputChange = (
    field: "discount" | "amountPaid",
    value: string,
  ) => {
    const numericValue = Math.round(parseFloat(value) || 0);
    if (numericValue < 0) return;

    setPaymentData((prev) => ({
      ...prev,
      [field]: numericValue,
    }));
  };

  const validateSaleData = (data: {
    name: string;
    mobile: string;
    email: string;
    items: any[];
    gstType: string;
    totalGst: number;
    shippingName?: string;
    shippingMobile?: string;
    shippingEmail?: string;
    shippingGst?: string;
    customerId?: string;
  }) => {
    const errors: string[] = [];

    const name = data.name?.trim() || "";
    if (!name || name.length < 3) {
      errors.push("Customer name must be at least 3 characters");
    }

    if (data.customerId) {
      if (!data.mobile || data.mobile.trim() === "") {
        errors.push(`${data.name} does not have a mobile number. A mobile number is required to process a sale. Please update their profile first.`);
      }
    } else {
      if (!data.mobile || data.mobile.trim() === "") {
        errors.push(`Please enter a valid 10-digit mobile number for ${data.name || "the new customer"}.`);
      } else {
        const exists = allCustomers.find((c: any) => c.mobile === data.mobile.trim() && c.id !== data.customerId);
        if (exists) {
          errors.push(`Mobile number ${data.mobile} is already registered to '${exists.name}'. To avoid duplicate ledgers, please select '${exists.name}' from the customer dropdown above.`);
        }
      }
    }

    if (data.mobile && data.mobile.trim() !== "") {
      if (!/^[6-9]\d{9}$/.test(data.mobile.trim())) {
        errors.push("Invalid Indian mobile number");
      }
    }

    if (data.email && data.email.trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.push("Invalid email format");
      }
    }

    if (data.shippingName && data.shippingName.trim() !== "") {
      if (data.shippingName.trim().length < 3) {
        errors.push("Shipping name must be at least 3 characters");
      }
    }

    if (data.shippingMobile && data.shippingMobile.trim() !== "") {
      if (!/^[6-9]\d{9}$/.test(data.shippingMobile.trim())) {
        errors.push("Invalid shipping mobile number");
      }
    }

    if (data.shippingEmail && data.shippingEmail.trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.shippingEmail.trim())) {
        errors.push("Invalid shipping email format");
      }
    }

    if (data.shippingGst && data.shippingGst.trim() !== "") {
      if (
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          data.shippingGst.trim(),
        )
      ) {
        errors.push("Invalid Shipping GST format");
      }
    }

    if (data.items.length === 0) {
      errors.push("Please add at least one item");
    }

    if (data.gstType !== "NONE") {
      const hasItemWithoutGst = data.items.some((item) => {
        if (data.gstType === "LOCAL") {
          return Number(item.cgst || 0) + Number(item.sgst || 0) <= 0;
        } else if (data.gstType === "INTERSTATE") {
          return Number(item.igst || 0) <= 0;
        }
        return false;
      });

      if (hasItemWithoutGst) {
        errors.push(
          `GST rates are mandatory for every item when tax type is ${data.gstType}`,
        );
      }
    }

    // Validate: if same product appears more than once, each must have a unique price
    const productGroups = new Map<string, number[]>();
    for (const item of data.items) {
      const pid = item.productId || item.id || "";
      if (!productGroups.has(pid)) productGroups.set(pid, []);
      productGroups.get(pid)!.push(Number(item.price));
    }
    for (const [, prices] of productGroups) {
      if (prices.length > 1) {
        const uniquePrices = new Set(prices.map((p) => p.toFixed(2)));
        if (uniquePrices.size !== prices.length) {
          errors.push(
            "Same item added multiple times must each have a different rate/cost. Please adjust the rates.",
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // Build a unit selector collection for a given item
  const getUnitCollection = (item: SelectedProduct) => {
    const items = [{ label: item.unit || "unit", value: item.unit || "unit" }];
    if (item.altUnit && item.altUnitConversion && item.altUnitConversion > 0) {
      items.push({ label: `${item.altUnit} (1=${item.altUnitConversion} ${item.unit})`, value: item.altUnit });
    }
    return createListCollection({ items });
  };

  return (
    <CustomModal
      width="75%"
      title={
        isView
          ? "Sale Details"
          : currentMode === "edit"
            ? "Edit Sale"
            : "Record New Sale"
      }
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      onEditClick={() => setCurrentMode("edit")}
      onConfirm={() => {
        const validation = validateSaleData({
          name: customerData.customerName,
          mobile: customerData.customerMobile,
          email: customerData.customerEmail,
          items: selectedItems,
          gstType: gstType,
          totalGst: totalGst,
          shippingName: customerData.shippingName,
          shippingMobile: customerData.shippingMobile,
          shippingEmail: customerData.shippingEmail,
          shippingGst: customerData.shippingGst,
          customerId: customerData.customerId || undefined,
        });

        if (!validation.isValid && validation.errors[0]) {
          toast.error(validation.errors[0]);
          return;
        }

        if (
          paymentData.paymentMode !== "CASH" &&
          !paymentData.referenceNumber
        ) {
          toast.error(
            `Reference Number is mandatory for this payment mode ${paymentData?.paymentMode}`,
          );
          return;
        }

        const currentPaid = Number(paymentData.amountPaid) || 0;
        const currentDiscount = Number(paymentData.discount) || 0;
        const currentBalance = grossTotal - currentPaid - currentDiscount;

        let paymentStatus = "PENDING";
        if (currentBalance <= 0) {
          paymentStatus = "PAID";
        } else if (currentPaid > 0) {
          paymentStatus = "PARTIALLY_PAID";
        }

        const finalCustomerData = {
          ...customerData,
          shippingName: isShippingSame
            ? customerData.customerName
            : customerData.shippingName,
          shippingMobile: isShippingSame
            ? customerData.customerMobile
            : customerData.shippingMobile,
          shippingEmail: isShippingSame
            ? customerData.customerEmail
            : customerData.shippingEmail,
        };

        const finalBillNo = customerData.billNo || `${billPrefix}${Date.now()}`;

        clearDraft();
        onSubmit({
          ...finalCustomerData,
          customerId: customerData.customerId || undefined,
          id: sale?.id,
          billNo: finalBillNo,
          poNumber: customerData.poNumber,
          poDate: customerData.poDate,
          vehicleNo: customerData.vehicleNo,
          gstType,
          items: selectedItems,
          freightCharges: Number(freightCharges),
          subtotal,
          totalAmount: grossTotal,
          totalGstAmount: totalGst,
          discount: currentDiscount,
          amountPaid: currentPaid,
          paymentMode: paymentData.paymentMode,
          referenceNumber: paymentData.referenceNumber,
          balance: currentBalance,
          paymentStatus: paymentStatus,
          referenceId: selectedReferenceId,
          earnedPoints: earnedPoints,
        });
      }}
      confirmLabel={currentMode === "add" ? "Save Sale" : "Update Sale"}
      mode={currentMode}
      loading={loading}
    >
      <Stack gap={6}>
        <Field.Root>
          <Field.Label>Bill Number</Field.Label>

          {isView ? (
            <Box
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              bg="gray.50"
              borderColor="gray.200"
            >
              <Text fontSize="sm" color="gray.500">
                Bill Number
              </Text>
              <Text fontWeight="bold">{customerData.billNo || "-"}</Text>
            </Box>
          ) : isEdit ? (
            <Input
              placeholder="Enter Bill Number"
              value={customerData.billNo}
              onChange={(e) =>
                setCustomerData({
                  ...customerData,
                  billNo: e.target.value,
                })
              }
            />
          ) : (
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <Box
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                cursor="pointer"
                transition="0.2s"
                _hover={{ shadow: "md" }}
                bg={billMode === "AUTO" ? "blue.50" : "white"}
                borderColor={billMode === "AUTO" ? "blue.500" : "gray.200"}
                onClick={() => setBillMode("AUTO")}
              >
                <HStack justify="space-between">
                  <Text fontWeight="bold">Automatic</Text>
                  <Box
                    w="16px"
                    h="16px"
                    borderRadius="full"
                    border="2px solid"
                    borderColor={billMode === "AUTO" ? "blue.500" : "gray.300"}
                    bg={billMode === "AUTO" ? "blue.500" : "transparent"}
                  />
                </HStack>

                <Text fontSize="sm" color="gray.500" mt={2}>
                  Auto generated bill number
                </Text>

                {billMode === "AUTO" && (
                  <Text mt={2} fontSize="sm" fontWeight="bold" color="blue.600">
                    {billPrefix}{Date.now()}
                  </Text>
                )}
              </Box>

              <Box
                p={4}
                borderWidth="1px"
                borderRadius="lg"
                cursor="pointer"
                transition="0.2s"
                _hover={{ shadow: "md" }}
                bg={billMode === "MANUAL" ? "green.50" : "white"}
                borderColor={billMode === "MANUAL" ? "green.500" : "gray.200"}
                onClick={() => setBillMode("MANUAL")}
              >
                <HStack justify="space-between">
                  <Text fontWeight="bold">Manual</Text>
                  <Box
                    w="16px"
                    h="16px"
                    borderRadius="full"
                    border="2px solid"
                    borderColor={
                      billMode === "MANUAL" ? "green.500" : "gray.300"
                    }
                    bg={billMode === "MANUAL" ? "green.500" : "transparent"}
                  />
                </HStack>

                <Text fontSize="sm" color="gray.500" mt={2}>
                  Enter custom bill number
                </Text>

                {billMode === "MANUAL" && (
                  <Input
                    mt={3}
                    placeholder="Enter Bill Number"
                    value={customerData.billNo}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        billNo: e.target.value,
                      })
                    }
                  />
                )}
              </Box>
            </Grid>
          )}
        </Field.Root>

        <Stack gap={8} w="full">
          <Stack gap={4}>
            <Text
              fontSize="lg"
              fontWeight="bold"
              borderBottom="1px solid"
              borderColor="gray.200"
              pb={2}
            >
              Billing Details
            </Text>
            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              <Field.Root>
                <Field.Label>Customer Name *</Field.Label>
                <Box position="relative">
                  <Input
                    placeholder="Search or enter customer name"
                    value={customerData.customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerData({
                        ...customerData,
                        customerId: "", // reset id since they are typing
                        customerName: val,
                      });
                      setCustomerSearch(val);
                      setShowCustomerDropdown(val.length > 0);
                    }}
                    onFocus={() => {
                      if (customerData.customerName.length > 0) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCustomerDropdown(false), 200);
                    }}
                    readOnly={isView}
                  />
                  {showCustomerDropdown && !isView && (() => {
                    const filtered = allCustomers.filter((c: any) =>
                      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      c.mobile?.includes(customerSearch)
                    );
                    if (filtered.length === 0) return null;
                    return (
                      <Box
                        position="absolute"
                        top="100%"
                        left={0}
                        right={0}
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        maxH="200px"
                        overflowY="auto"
                        zIndex={10}
                        shadow="lg"
                      >
                        {filtered.slice(0, 10).map((c: any) => (
                          <Box
                            key={c.id}
                            p={2}
                            cursor="pointer"
                            _hover={{ bg: "brand.50" }}
                            onMouseDown={() => {
                              setCustomerData({
                                ...customerData,
                                customerId: c.id || "",
                                customerName: c.name || "",
                                customerMobile: c.mobile || "",
                                customerEmail: c.email || "",
                                customerAddress: c.address || "",
                                gstNumber: c.gstNumber || "",
                              });
                              setShowCustomerDropdown(false);
                            }}
                          >
                            <Text fontSize="sm" fontWeight="medium">{c.name}</Text>
                            {c.mobile && <Text fontSize="xs" color="gray.500">{c.mobile}</Text>}
                          </Box>
                        ))}
                      </Box>
                    );
                  })()}
                </Box>
                {customerData.customerId && !isView && (
                  <Badge colorPalette="green" size="sm" mt={1}>✓ Linked to existing customer</Badge>
                )}
                {!customerData.customerId && !isView && !isEdit && customerData.customerName.length > 0 && (
                  <Badge colorPalette="orange" size="sm" mt={1}>New customer — mobile number required</Badge>
                )}
              </Field.Root>
              <Field.Root>
                <Field.Label>Mobile Number</Field.Label>
                <Input
                  type="number"
                  placeholder="10-digit mobile"
                  value={customerData.customerMobile}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      customerMobile: e.target.value,
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Customer Email</Field.Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={customerData.customerEmail}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      customerEmail: e.target.value,
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>GST Number</Field.Label>
                <Input
                  placeholder="GSTIN"
                  value={customerData.gstNumber}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      gstNumber: e.target.value.toUpperCase(),
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>
              <Box gridColumn="span 2">
                <Field.Root>
                  <Field.Label>Customer Address</Field.Label>
                  <Input
                    type="text"
                    placeholder="Enter Billing Address"
                    value={customerData.customerAddress}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        customerAddress: e.target.value,
                      })
                    }
                    readOnly={isView}
                  />
                </Field.Root>
              </Box>
            </Grid>
          </Stack>

          <Stack gap={4}>
            <Stack
              direction="row"
              justify="space-between"
              align="center"
              borderBottom="1px solid"
              borderColor="gray.200"
              pb={1}
            >
              <Text fontSize="lg" fontWeight="bold">
                Shipping Details
              </Text>
              {!isView && (
                <Checkbox
                  checked={isShippingSame}
                  onCheckedChange={(e) => setIsShippingSame(!!e.checked)}
                >
                  Same as Billing
                </Checkbox>
              )}
            </Stack>
            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              <Field.Root>
                <Field.Label>Shipping Name</Field.Label>
                <Input
                  placeholder="Recipient Name"
                  value={
                    isShippingSame
                      ? customerData.customerName
                      : customerData.shippingName
                  }
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      shippingName: e.target.value,
                    })
                  }
                  readOnly={isView || isShippingSame}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Shipping Mobile</Field.Label>
                <Input
                  placeholder="Recipient Mobile"
                  value={
                    isShippingSame
                      ? customerData.customerMobile
                      : customerData.shippingMobile
                  }
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      shippingMobile: e.target.value,
                    })
                  }
                  readOnly={isView || isShippingSame}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Shipping Email</Field.Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={
                    isShippingSame
                      ? customerData.customerEmail
                      : customerData.shippingEmail
                  }
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      shippingEmail: e.target.value,
                    })
                  }
                  readOnly={isView || isShippingSame}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Shipping GST Number</Field.Label>
                <Input
                  placeholder="GSTIN"
                  value={customerData.shippingGst}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      shippingGst: e.target.value.toUpperCase(),
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>

              <Box gridColumn="span 2">
                <Field.Root>
                  <Field.Label>Shipping Address</Field.Label>
                  <Input
                    placeholder="Complete Address"
                    value={customerData.shippingAddress}
                    onChange={(e) =>
                      setCustomerData({
                        ...customerData,
                        shippingAddress: e.target.value,
                      })
                    }
                    readOnly={isView}
                  />
                </Field.Root>
              </Box>
            </Grid>
          </Stack>

          <Box pt={4} width="full">
            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              <Field.Root>
                <Field.Label>PO Number</Field.Label>
                <Input
                  placeholder="Enter PO Number"
                  value={customerData.poNumber}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      poNumber: e.target.value,
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>PO Date</Field.Label>
                <Input
                  type="date"
                  value={customerData.poDate}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      poDate: e.target.value,
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Vehicle No</Field.Label>
                <Input
                  placeholder="RJ14 AB 1234"
                  value={customerData.vehicleNo}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      vehicleNo: e.target.value,
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Sale Date</Field.Label>
                <Input
                  type="date"
                  value={customerData.saleDate}
                  onChange={(e) =>
                    setCustomerData({
                      ...customerData,
                      saleDate: e.target.value,
                    })
                  }
                  readOnly={isView}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Tax Type</Field.Label>
                <SelectRoot
                  collection={gstTypeCollection}
                  value={[gstType]}
                  disabled={isView || isEdit}
                  onValueChange={(e) => setGstType(e.value[0] as any)}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="Choose tax type" />
                  </SelectTrigger>
                  <SelectContent>
                    {gstTypeCollection.items.map((i) => (
                      <SelectItem key={i.value} item={i}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Field.Root>
              <Field.Root>
                <Field.Label>Select Reference</Field.Label>
                <SelectRoot
                  collection={referenceCollection}
                  value={selectedReferenceId ? [selectedReferenceId] : []}
                  onValueChange={(e) =>
                    e.value[0] && setSelectedReferenceId(e.value[0])
                  }
                  disabled={isView || isEdit}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="Search reference..." />
                  </SelectTrigger>
                  <SelectContent portalled={false}>
                    <Box p={2}>
                      <Input
                        placeholder="Type name or ID..."
                        size="sm"
                        value={refSearch}
                        onChange={(e) => setRefSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </Box>
                    {referenceCollection.items.map((ref) => (
                      <SelectItem key={ref.value} item={ref}>
                        <Stack gap={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {ref.label}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {ref.refNo} | {ref.mobile}
                          </Text>
                        </Stack>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Field.Root>
            </Grid>
          </Box>
        </Stack>

        {selectedReferenceId && (
          <Box
            mt={2}
            p={4}
            bg="brand.50"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="brand.200"
            width="full"
          >
            <Grid
              templateColumns="repeat(4, 1fr) auto"
              gap={4}
              alignContent="center"
            >
              <Stack gap={0}>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color="brand.600"
                  textTransform="uppercase"
                >
                  Ref Number
                </Text>
                <Text fontSize="xs" fontWeight="medium" truncate>
                  {
                    references.find((r) => r.id === selectedReferenceId)
                      ?.referenceNumber
                  }
                </Text>
              </Stack>

              <Stack gap={0}>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color="brand.600"
                  textTransform="uppercase"
                >
                  Name
                </Text>
                <Text fontSize="xs" fontWeight="medium" truncate>
                  {references.find((r) => r.id === selectedReferenceId)?.name}
                </Text>
              </Stack>

              <Stack gap={0}>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color="brand.600"
                  textTransform="uppercase"
                >
                  Mobile
                </Text>
                <Text fontSize="xs" fontWeight="medium" truncate>
                  {references.find((r) => r.id === selectedReferenceId)?.mobile}
                </Text>
              </Stack>

              <Stack gap={0}>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color="brand.600"
                  textTransform="uppercase"
                >
                  Email
                </Text>
                <Text fontSize="xs" fontWeight="medium" truncate>
                  {references.find((r) => r.id === selectedReferenceId)
                    ?.email || "N/A"}
                </Text>
              </Stack>
              <Stack gap={0}>
                <Text
                  fontSize="2xs"
                  fontWeight="bold"
                  color="yellow.600"
                  textTransform="uppercase"
                >
                  Points Earned
                </Text>
                <HStack gap={1}>
                  <Text fontSize="sm" fontWeight="black" color="yellow.700">
                    {earnedPoints}
                  </Text>
                  <Text fontSize="2xs" fontWeight="bold" color="yellow.600">
                    PTS
                  </Text>
                </HStack>
              </Stack>
              {currentMode === "add" && (
                <Flex align="center">
                  <Button
                    size="xs"
                    variant="subtle"
                    colorPalette="red"
                    onClick={() => setSelectedReferenceId("")}
                  >
                    Remove
                  </Button>
                </Flex>
              )}
            </Grid>
          </Box>
        )}

        {!isView && (
          <Field.Root>
            <Field.Label>Add Product *</Field.Label>
            <SelectRoot
              collection={productCollection}
              value={selectedProductId ? [selectedProductId] : []}
              onValueChange={(e) => {
                const id = e.value[0];
                if (id) {
                  handleAddProduct(id);
                  setSelectedProductId(null);
                }
              }}
            >
              <SelectTrigger>
                <SelectValueText placeholder="Select product from inventory..." />
              </SelectTrigger>
              <SelectContent>
                <Box p={2}>
                  <Input
                    placeholder="Search name or hsn..."
                    size="sm"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </Box>
                {productCollection.items.map((i) => (
                  <SelectItem key={i.value} item={i}>
                    <Text textTransform="uppercase" whiteSpace="normal" wordBreak="break-word">
                      {i.label} ({i.hsn}) {i.size ? `- ${i.size}` : ""}{" "}
                      {i.unit ? `- ${i.unit}` : ""}
                      {(i as any).altUnit ? ` / ${(i as any).altUnit}` : ""}
                      {i.color ? `- ${i.color}` : ""}
                    </Text>
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Field.Root>
        )}

        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          <CustomTable
            columns={columns}
            data={selectedItems}
            renderRow={(item, _index) => {
              const isReadOnlyItem = isView || (isEdit && !item.isNew);
              const unitCollection = getUnitCollection(item);
              const hasAltUnit = !!(item.altUnit && item.altUnitConversion && item.altUnitConversion > 0);
              return (
                <Table.Row key={item.lineId || item.id}>
                  <Table.Cell fontWeight="medium">
                    <Box>
                      {item.name} {item.size ? `- ${item.size}` : ""}{" "}
                      {item.color ? `- ${item.color}` : ""}
                      {!isView && !isEdit && (
                        <Text fontSize="xs" color="gray.500">
                          Available:{" "}
                          <b>
                            {products.find((p) => p.id === item.id)
                              ?.availableStock ?? 0}
                          </b>
                        </Text>
                      )}
                      {(isView || isEdit) && (
                        <Text fontSize="xs" color="gray.500">
                          HSN: {item.hsn}
                        </Text>
                      )}
                    </Box>
                  </Table.Cell>
                  <Table.Cell width="130px">
                    {hasAltUnit && !isReadOnlyItem ? (
                      <SelectRoot
                        collection={unitCollection}
                        value={[item.selectedUnit || item.unit || "unit"]}
                        onValueChange={(e) => {
                          if (e.value[0]) {
                            updateItem(item.lineId!, { selectedUnit: e.value[0] });
                          }
                        }}
                        size="sm"
                      >
                        <SelectTrigger>
                          <SelectValueText />
                        </SelectTrigger>
                        <SelectContent portalled={false}>
                          {unitCollection.items.map((u) => (
                            <SelectItem key={u.value} item={u}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    ) : (
                      <Text fontSize="sm" fontWeight="medium">
                        {item.selectedUnit || item.unit || "unit"}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell width="110px">
                    <Input
                      type="number"
                      size="sm"
                      value={item.qty === 0 ? "" : item.qty}
                      readOnly={isReadOnlyItem}
                      min={0}
                      onChange={(e) =>
                        updateItem(item.lineId!, { qty: Number(e.target.value) })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                    />
                  </Table.Cell>
                  <Table.Cell width="140px">
                    <VStack align="stretch" gap={1}>
                      <HStack gap={1}>
                        <MdEdit color="gray" size={14} />
                        <Input
                          type="number"
                          size="sm"
                          value={item.customInflatedPrice !== undefined ? item.customInflatedPrice : Number(item.basePrice).toFixed(2)}
                          onChange={(e) => updateItem(item.lineId!, { customInflatedPrice: e.target.value, priceSource: undefined })}
                          readOnly={isReadOnlyItem}
                        />
                      </HStack>
                      <HStack justify="space-between" fontSize="2xs">
                        <Text fontSize="2xs" color="gray.500">
                          ₹{Number(item.price).toFixed(2)} / {item.selectedUnit || item.unit || "unit"}
                        </Text>
                        {item.priceSource === "CUSTOMER" && (
                          <Badge size="xs" colorPalette="green" variant="subtle" title="Last rate billed to this customer">
                            Customer
                          </Badge>
                        )}
                        {item.priceSource === "GLOBAL_LAST" && (
                          <Badge size="xs" colorPalette="blue" variant="subtle" title="Last rate billed across all customers">
                            Last Sold
                          </Badge>
                        )}
                      </HStack>
                    </VStack>
                  </Table.Cell>
                  <Table.Cell width="90px">
                    <Input
                      type="number"
                      size="sm"
                      placeholder="0%"
                      value={item.itemDiscPercent || ""}
                      readOnly={isReadOnlyItem}
                      onChange={(e) =>
                        updateItem(item.lineId!, {
                          itemDiscPercent: e.target.value,
                        })
                      }
                      min={0}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                    />
                  </Table.Cell>
                  {gstType !== "NONE" && !isView && (
                    <Table.Cell width="110px">
                      <SelectRoot
                        collection={gstRateCollection}
                        value={[
                          gstType === "LOCAL"
                            ? (
                                Number(item.cgst || 0) + Number(item.sgst || 0)
                              ).toString()
                            : Number(item.igst || 0).toString(),
                        ]}
                        onValueChange={(e) => {
                          const rate = Number(e.value[0]);
                          const taxUpdates =
                            gstType === "LOCAL"
                              ? { cgst: rate / 2, sgst: rate / 2, igst: 0 }
                              : { igst: rate, cgst: 0, sgst: 0 };

                          updateItem(item.lineId!, taxUpdates);
                        }}
                        disabled={isReadOnlyItem}
                      >
                        <SelectTrigger bg="white">
                          <SelectValueText placeholder="GST %" />
                        </SelectTrigger>
                        <SelectContent portalled={false}>
                          {gstRateCollection.items.map((i) => (
                            <SelectItem key={i.value} item={i}>
                              {i.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Table.Cell>
                  )}
                  {gstType === "LOCAL" && (
                    <>
                      <Table.Cell width="90px">
                        <Input
                          placeholder="0"
                          size="sm"
                          type="number"
                          value={item.cgst === 0 ? "" : item.cgst}
                          onChange={(e) =>
                            updateItem(item.lineId!, {
                              cgst: Number(e.target.value),
                            })
                          }
                          readOnly={isReadOnlyItem}
                          min={0}
                          onKeyDown={(e) =>
                            ["e", "E", "+", "-"].includes(e.key) &&
                            e.preventDefault()
                          }
                        />
                      </Table.Cell>
                      <Table.Cell width="90px">
                        <Input
                          placeholder="0"
                          size="sm"
                          type="number"
                          value={item.sgst === 0 ? "" : item.sgst}
                          onChange={(e) =>
                            updateItem(item.lineId!, {
                              sgst: Number(e.target.value),
                            })
                          }
                          readOnly={isReadOnlyItem}
                          min={0}
                          onKeyDown={(e) =>
                            ["e", "E", "+", "-"].includes(e.key) &&
                            e.preventDefault()
                          }
                        />
                      </Table.Cell>
                    </>
                  )}
                  {gstType === "INTERSTATE" && (
                    <Table.Cell width="90px">
                      <Input
                        placeholder="0"
                        size="sm"
                        type="number"
                        value={item.igst === 0 ? "" : item.igst}
                        onChange={(e) =>
                          updateItem(item.lineId!, { igst: Number(e.target.value) })
                        }
                        readOnly={isReadOnlyItem}
                        min={0}
                        onKeyDown={(e) =>
                          ["e", "E", "+", "-"].includes(e.key) &&
                          e.preventDefault()
                        }
                      />
                    </Table.Cell>
                  )}
                  <Table.Cell textAlign="end" fontWeight="bold">
                    ₹{Number(item.priceAfterGst).toFixed(2)}
                  </Table.Cell>
                  {!isView && (
                    <Table.Cell textAlign="center">
                      {!isReadOnlyItem && (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() =>
                            setSelectedItems(
                              selectedItems.filter((it) => (it.lineId || it.id) !== (item.lineId || item.id)),
                            )
                          }
                        >
                          <MdDelete />
                        </IconButton>
                      )}
                    </Table.Cell>
                  )}
                </Table.Row>
              );
            }}
          />
          <Box p={4} bg="brand.50" borderTopWidth="1px">
            <HStack justify="space-between">
              <Text fontSize="md" fontWeight="bold">
                Total Amount:
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="brand.600">
                ₹{totalAmount.toFixed(2)}
              </Text>
            </HStack>
          </Box>
          {existingReturn &&
            existingReturn.map((r: any) => (
              <Box
                key={r.id}
                mx={4}
                mb={4}
                p={4}
                mt={4}
                bg="orange.50"
                border="1px solid"
                borderColor="orange.200"
                borderRadius="lg"
              >
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <HStack>
                      <Badge colorPalette="orange" variant="solid">
                        RETURNED
                      </Badge>
                      <Text fontSize="sm" fontWeight="bold" color="orange.800">
                        Note: {r.returnNo || r.returnNumber}
                      </Text>
                    </HStack>
                    <Text fontSize="xs" color="orange.600" fontWeight="medium">
                      {formatDate(r.returnDate)}
                    </Text>
                  </HStack>

                  <Box
                    borderRadius="md"
                    border="1px solid"
                    borderColor="orange.100"
                    bg="white/50"
                    overflow="hidden"
                  >
                    <Table.Root size="sm">
                      <Table.Header bg="orange.100/50">
                        <Table.Row>
                          <Table.ColumnHeader fontSize="2xs" color="orange.800">
                            ITEM
                          </Table.ColumnHeader>
                          <Table.ColumnHeader
                            fontSize="2xs"
                            color="orange.800"
                            textAlign="end"
                          >
                            RET QTY
                          </Table.ColumnHeader>
                          <Table.ColumnHeader
                            fontSize="2xs"
                            color="orange.800"
                            textAlign="end"
                          >
                            REFUND
                          </Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {r.items?.map((item: any, idx: number) => (
                          <Table.Row key={idx}>
                            <Table.Cell fontSize="2xs" fontWeight="bold">
                              {item.itemName || item.name}
                            </Table.Cell>
                            <Table.Cell fontSize="2xs" textAlign="end">
                              x{item.returnQty}
                            </Table.Cell>
                            <Table.Cell
                              fontSize="2xs"
                              textAlign="end"
                              fontWeight="bold"
                            >
                              ₹{Number(item.priceAfterGst || 0).toFixed(2)}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>

                  <Separator borderColor="orange.200" />

                  <VStack align="stretch" gap={1}>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="orange.800">
                        Total Return Amount:
                      </Text>
                      <Text
                        fontSize="xs"
                        color="orange.800"
                        fontWeight="medium"
                      >
                        ₹{Number(r.totalAmount || 0).toFixed(2)}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="red.600">
                        Discount Adjusted (-):
                      </Text>
                      <Text fontSize="xs" color="red.600" fontWeight="medium">
                        ₹{Number(r.discountApplied || 0).toFixed(2)}
                      </Text>
                    </HStack>
                  </VStack>

                  <Box borderTopWidth="1px" borderColor="orange.200" pt={2}>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="orange.700" fontWeight="bold">
                        Net Refundable:
                      </Text>
                      <Text fontSize="md" fontWeight="black" color="orange.600">
                        ₹{Number(r.netRefund || 0).toFixed(2)}
                      </Text>
                    </HStack>
                  </Box>

                  {r.remarks && (
                    <Text fontSize="2xs" fontStyle="italic" color="orange.500">
                      * {r.remarks}
                    </Text>
                  )}
                </VStack>
              </Box>
            ))}
        </Box>
        <Flex
          gap={6}
          mt={4}
          align="flex-start"
          direction={{ base: "column", lg: "row" }}
        >
          <Box flex={1}>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <Box>
                <HStack justify="space-between" mb={1.5}>
                  <Text fontSize="xs" fontWeight="bold">
                    ADDITIONAL DISCOUNT ({discountType === "amount" ? "₹" : "%"}
                    )
                  </Text>
                  <HStack
                    gap={0}
                    borderWidth="1px"
                    borderRadius="md"
                    overflow="hidden"
                  >
                    <Box
                      px={2}
                      py={0.5}
                      fontSize="2xs"
                      fontWeight="bold"
                      cursor="pointer"
                      bg={discountType === "amount" ? "brand.600" : "white"}
                      color={discountType === "amount" ? "white" : "gray.600"}
                      onClick={() => !isView && setDiscountType("amount")}
                    >
                      ₹
                    </Box>
                    <Box
                      px={2}
                      py={0.5}
                      fontSize="2xs"
                      fontWeight="bold"
                      cursor="pointer"
                      bg={discountType === "percentage" ? "brand.600" : "white"}
                      color={
                        discountType === "percentage" ? "white" : "gray.600"
                      }
                      onClick={() => !isView && setDiscountType("percentage")}
                    >
                      %
                    </Box>
                  </HStack>
                </HStack>

                <Input
                  type="number"
                  bg="white"
                  readOnly={isView}
                  value={
                    paymentData.discount === 0
                      ? ""
                      : discountType === "percentage" && grossTotal > 0
                        ? Math.round((paymentData.discount / grossTotal) * 100)
                        : paymentData.discount
                  }
                  placeholder={discountType === "percentage" ? "0%" : "0"}
                  onChange={(e) => {
                    let rawValue = e.target.value;

                    if (rawValue === "") {
                      handlePaymentInputChange("discount", "0");
                      return;
                    }

                    let val = Math.round(parseFloat(rawValue));
                    if (isNaN(val) || val < 0) return;

                    let calcDiscount = 0;
                    if (discountType === "percentage") {
                      if (val > 100) val = 100;
                      calcDiscount = Math.round((grossTotal * val) / 100);
                    } else {
                      calcDiscount = val;
                    }

                    const maxAllowed = Math.round(
                      grossTotal - (Number(paymentData.amountPaid) || 0),
                    );

                    if (calcDiscount > maxAllowed) {
                      toast.warning(
                        `Discount cannot exceed total bill amount.`,
                      );
                      calcDiscount = maxAllowed;
                    }

                    handlePaymentInputChange(
                      "discount",
                      calcDiscount.toString(),
                    );
                  }}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-", "."].includes(e.key) &&
                    e.preventDefault()
                  }
                />
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1.5}>
                  AMOUNT PAID (₹)
                </Text>
                <Input
                  type="number"
                  bg="white"
                  readOnly={isView || isEdit}
                  value={
                    paymentData.amountPaid === 0 ? "" : paymentData.amountPaid
                  }
                  placeholder="0"
                  onChange={(e) => {
                    let rawValue = e.target.value;

                    if (rawValue === "") {
                      handlePaymentInputChange("amountPaid", "0");
                      return;
                    }

                    let val = Math.round(parseFloat(rawValue));
                    if (isNaN(val) || val < 0) return;

                    const maxAllowed = Math.round(
                      grossTotal - (Number(paymentData.discount) || 0),
                    );

                    if (val > maxAllowed) {
                      toast.warning(
                        `Amount paid cannot exceed total bill amount.`,
                      );
                      val = maxAllowed;
                    }

                    handlePaymentInputChange("amountPaid", val.toString());
                  }}
                  min={0}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-", "."].includes(e.key) &&
                    e.preventDefault()
                  }
                />
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1.5}>
                  FREIGHT CHARGES (₹)
                </Text>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={freightCharges === 0 ? "" : freightCharges}
                  readOnly={isView}
                  min={0}
                  onChange={(e) =>
                    setFreightCharges(Number(e.target.value) || 0)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                  }
                />
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1.5}>
                  PAYMENT MODE
                </Text>
                <SelectRoot
                  collection={paymentMethods}
                  value={[paymentData.paymentMode || "CASH"]}
                  disabled={isView || isEdit}
                  onValueChange={(e) => {
                    if (e.value[0]) {
                      setPaymentData({
                        ...paymentData,
                        paymentMode: e.value[0],
                      });
                    }
                  }}
                >
                  <SelectTrigger bg="white">
                    <SelectValueText />
                  </SelectTrigger>
                  <SelectContent portalled={false}>
                    {paymentMethods.items.map((m) => (
                      <SelectItem key={m.value} item={m}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Box>

              <Box gridColumn="span 2">
                <Text fontSize="xs" fontWeight="bold" mb={1.5}>
                  REF / UTR NO.{" "}
                  {paymentData.paymentMode !== "CASH" && (
                    <Text as="span" color="red.500">
                      *
                    </Text>
                  )}
                </Text>
                <Input
                  placeholder={
                    paymentData.paymentMode === "CASH" ? "N/A" : "Enter Ref"
                  }
                  bg="white"
                  readOnly={isView || isEdit}
                  value={paymentData.referenceNumber}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      referenceNumber: e.target.value,
                    })
                  }
                />
              </Box>
            </Grid>
          </Box>

          <Box
            borderWidth="1px"
            borderRadius="xl"
            p={6}
            bg="gray.50"
            minW="380px"
            shadow="sm"
            borderColor="gray.200"
          >
            <VStack gap={3} align="stretch">
              <Text
                fontWeight="bold"
                fontSize="md"
                mb={2}
                borderBottom="1px solid"
                borderColor="gray.300"
                pb={2}
              >
                Bill Summary
              </Text>

              <HStack justify="space-between" fontSize="sm">
                <Text color="gray.600">Items Subtotal:</Text>
                <Text fontWeight="medium">₹{subtotal.toFixed(2)}</Text>
              </HStack>

              <HStack justify="space-between" fontSize="sm">
                <Text color="gray.600">Total GST:</Text>
                <Text fontWeight="medium">₹{totalGst.toFixed(2)}</Text>
              </HStack>

              <HStack justify="space-between" fontSize="sm">
                <Text color="gray.600">Freight Charges:</Text>
                <Text fontWeight="medium">
                  ₹{Number(freightCharges).toFixed(2)}
                </Text>
              </HStack>

              <Separator borderColor="gray.300" />

              <HStack justify="space-between">
                <Text fontWeight="bold" fontSize="lg">
                  Gross Total:
                </Text>
                <Text fontWeight="bold" fontSize="xl" color="brand.600">
                  ₹{grossTotal.toFixed(2)}
                </Text>
              </HStack>

              <VStack
                gap={2}
                mt={2}
                p={3}
                bg="white"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
              >
                <HStack justify="space-between" w="full" fontSize="sm">
                  <Text color="red.600" fontWeight="medium">
                    (-) Discount:
                  </Text>
                  <Text color="red.600">
                    - ₹{Number(paymentData.discount).toFixed(2)}
                  </Text>
                </HStack>
                <HStack justify="space-between" w="full" fontSize="sm">
                  <Text color="green.600" fontWeight="medium">
                    (-) Amount Paid:
                  </Text>
                  <Text color="green.600">
                    - ₹{Number(paymentData.amountPaid).toFixed(2)}
                  </Text>
                </HStack>

                {totalReturnAmount > 0 && (
                  <HStack
                    justify="space-between"
                    w="full"
                    fontSize="sm"
                    pt={1}
                    borderTop="1px dashed"
                    borderColor="orange.200"
                  >
                    <Text color="orange.600" fontWeight="bold">
                      (-) Net Refund:
                    </Text>
                    <Text color="orange.600" fontWeight="bold">
                      - ₹{totalReturnAmount.toFixed(2)}
                    </Text>
                  </HStack>
                )}
              </VStack>

              <HStack
                justify="space-between"
                p={3}
                bg="brand.600"
                borderRadius="lg"
                color="white"
                shadow="md"
              >
                <Text fontWeight="bold">Balance Due:</Text>

                <Text fontWeight="black" fontSize="lg">
                  ₹
                  {isView
                    ? Number(sale?.balance || 0).toFixed(2)
                    : Number(balance || 0).toFixed(2)}{" "}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Flex>
      </Stack>
    </CustomModal>
  );
};
