import {
  Stack,
  Input,
  Field,
  Text,
  Box,
  Grid,
  HStack,
  VStack,
  Table,
  Flex,
  createListCollection,
  Separator,
  Badge,
  IconButton,
} from "@chakra-ui/react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { CustomTable } from "@/components/ui/CustomTable";
import { Supplier } from "@/types/supplier";
import { formatDate, getISTDateString } from "@/utils/dateUtils";
import { toast } from "@/utils/toast";
import { MdDelete, MdPictureAsPdf, MdReceipt } from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  useAddBillPaymentMutation,
  useDeleteBillPaymentMutation,
} from "@/store/apiSlice";
import { generateSupplierPDF } from "@/utils/pdfGenerator";
import { Tooltip } from "@/components/ui/tooltip";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  supplier: Supplier | null;
  orderData: any;
  isLoading: boolean;
  bill?: any;
  mode?: "view" | "add" | "edit";
}

export const ReceivePurchaseOrder = ({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  orderData,
  isLoading,
  bill,
  mode: initialMode = "add",
}: Props) => {
  const [addBillPayment, { isLoading: isSubmittingPayment }] =
    useAddBillPaymentMutation();
  const [deleteBillPayment, { isLoading: isDeletingPayment }] =
    useDeleteBillPaymentMutation();

  const [items, setItems] = useState<any[]>([]);
  const [freight, setFreight] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [referenceNo, setReferenceNo] = useState<string>(" ");
  const [billNumber, setBillNumber] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(
    getISTDateString(new Date()),
  );
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "CASH",
    referenceNumber: "",
    paymentDate: getISTDateString(new Date()),
  });

  const [discountType, setDiscountType] = useState<"amount" | "percentage">(
    "amount",
  );
  const [localDiscount, setLocalDiscount] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, isOpen]);

  const isReadOnly = currentMode === "view";

  useEffect(() => {
    if (isOpen) {
      if (isReadOnly && bill) {
        setBillNumber(bill.billNumber || "");
        setBillDate(getISTDateString(bill.billDate));
        setVehicleNumber(bill.vehicleNumber || "");
        setFreight(Number(bill.freightCharges) || 0);
        setAmountPaid(Number(bill.amountPaid) || 0);

        const savedDiscount = Number(bill.discount) || 0;
        setDiscountAmount(savedDiscount);
        setLocalDiscount(savedDiscount > 0 ? savedDiscount.toString() : "");
        setDiscountType("amount");

        const mappedItems = (bill.items || []).map((i: any) => ({
          ...i,
          id: i.id,
          qty: Number(i.orderedQty),
          receivedQty: Number(i.receivedQty),
          basePrice: Number(i.basePrice || i.price),
          conversionRate: Number(i.conversionRate || 1),
          unit: i.unit || "unit",
          size: i.size,
          price: Number(i.price),
          discPercent: Number(i.discPercent),
          cgst: Number(i.cgst),
          sgst: Number(i.sgst),
          igst: Number(i.igst),
          taxableValue: Number(i.taxableValue),
          priceAfterGst: Number(i.priceAfterGst),
          buyingPrice: Number(i.buyingPrice),
          sellingPrice: Number(i.sellingPrice),
        }));
        setItems(mappedItems);

        if (bill.payments && bill.payments.length > 0) {
          setPaymentMode(bill.payments[0].method);
          setReferenceNo(bill.payments[0].referenceNumber || "");
        }
      } else if (orderData) {
        setBillNumber("");
        setBillDate(getISTDateString(new Date()));
        setVehicleNumber(orderData.lrNumber || orderData.lr_number || "");
        setFreight(Number(orderData.freightAmount || orderData.freight_amount || 0));
        setAmountPaid(0);
        setReferenceNo("");
        setPaymentMode("CASH");
        setDiscountAmount(0);
        setLocalDiscount("");
        setDiscountType("amount");

        const normalized = (orderData.items || []).map((i: any) => {
          const qty = Number(i.qty) || 0;
          const bPrice = Number(i.basePrice || i.price) || 0;
          const cRate = Number(i.conversionRate) || 1;
          const discPercent = Number(i.discPercent) || 0;

          const priceBeforeDisc = bPrice * cRate;
          const finalPrice =
            priceBeforeDisc - (priceBeforeDisc * discPercent) / 100;

          const taxableValue = qty * finalPrice;
          const cgst = Number(i.cgst) || 0;
          const sgst = Number(i.sgst) || 0;
          const igst = Number(i.igst) || 0;
          const totalRate = orderData?.gstType === "LOCAL" ? cgst + sgst : igst;
          const gstAmount = (taxableValue * totalRate) / 100;

          const totalQty = qty * cRate;
          const pAfterGst = taxableValue + gstAmount;

          return {
            ...i,
            id: i.id,
            receivedQty: qty,
            basePrice: bPrice,
            conversionRate: cRate,
            unit: i.unit || "unit",
            size: i.size,
            price: finalPrice,
            discPercent: discPercent,
            cgst: cgst,
            sgst: sgst,
            igst: igst,
            taxableValue: taxableValue,
            gstAmount: gstAmount,
            priceAfterGst: pAfterGst,
            buyingPrice: totalQty > 0 ? pAfterGst / totalQty : 0,
            sellingPrice: i.sellingPrice || 0,
          };
        });
        setItems(normalized);
      }
    }
  }, [isOpen, orderData, bill, isReadOnly]);

  const updateItemField = (id: string, field: string, value: any) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      const qty = Number(item.receivedQty) || 0;

      const bPrice = Math.max(0, Number(item.basePrice) || 0);
      const rawConversion = item.conversionRate;
      const cRate =
        rawConversion === "" ? 1 : Math.max(0, Number(rawConversion) || 1);
      const discPercent = Math.min(
        100,
        Math.max(0, Number(item.discPercent) || 0),
      );

      const priceBeforeDisc = bPrice * cRate;
      const finalPrice =
        priceBeforeDisc - (priceBeforeDisc * discPercent) / 100;

      const taxableValue = qty * finalPrice;

      const cgst = Number(item.cgst) || 0;
      const sgst = Number(item.sgst) || 0;
      const igst = Number(item.igst) || 0;

      const totalRate = orderData?.gstType === "LOCAL" ? cgst + sgst : igst;
      const gstAmount = (taxableValue * totalRate) / 100;

      const priceAfterGst = Number(taxableValue) + Number(gstAmount);
      const totalQuantity = qty * cRate;
      const buyingPrice = totalQuantity > 0 ? priceAfterGst / totalQuantity : 0;

      updated[index] = {
        ...item,
        basePrice: bPrice,
        conversionRate: rawConversion,
        price: finalPrice,
        taxableValue: Number(taxableValue),
        gstAmount: Number(gstAmount),
        priceAfterGst: priceAfterGst,
        buyingPrice: Number(buyingPrice),
      };
      return updated;
    });
  };

  const paymentMethods = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Cash", value: "CASH" },
          { label: "Bank Transfer", value: "BANK_TRANSFER" },
          { label: "UPI", value: "UPI" },
          { label: "Cheque", value: "CHEQUE" },
        ],
      }),
    [],
  );

  const totals = useMemo(() => {
    const sub = items.reduce(
      (acc, item) => acc + Number(item.taxableValue || 0),
      0,
    );
    const gst = items.reduce(
      (acc, item) => acc + Number(item.gstAmount || 0),
      0,
    );
    const grand = Number(sub) + Number(gst) + Number(freight || 0);
    return {
      subtotal: bill ? Number(bill?.subtotal) : Number(sub),
      totalGst: bill ? Number(bill?.totalGstAmount) : Number(gst),
      grandTotal: bill ? Number(bill?.totalAmount) : Number(grand),
    };
  }, [items, freight, bill]);

  const handleDiscountChange = (
    type: "amount" | "percentage",
    rawValue: string,
  ) => {
    if (rawValue === "") {
      setLocalDiscount("");
      setDiscountAmount(0);
      return;
    }

    let val = parseFloat(rawValue);
    if (isNaN(val)) return;

    if (type === "percentage") {
      if (val > 100) {
        toast.warning("Discount cannot exceed 100%");
        val = 100;
        rawValue = "100";
      }
      setLocalDiscount(rawValue);
      setDiscountAmount((totals.grandTotal * val) / 100);
    } else {
      if (val > totals.grandTotal) {
        toast.warning("Discount cannot exceed total bill amount");
        val = totals.grandTotal;
        rawValue = totals.grandTotal.toString();
      }
      setLocalDiscount(rawValue);
      setDiscountAmount(val);
    }
  };

  const handleConfirm = () => {
    if (!billNumber) return toast.error("Bill Number is required");

    if (items.length === 0) return toast.error("At least one item is required");

    for (const item of items) {
      const rQty = Number(item.receivedQty || 0);

      if (rQty <= 0) {
        return toast.error(
          `Received Quantity for ${item.name} must be greater than 0`,
        );
      }

      if (Number(item.price) < 0) {
        return toast.error(`Price of ${item.name} must be greater than 0`);
      }

      if (orderData?.gstType !== "NONE") {
        const hasInvalidTax = items.some((item) => {
          const taxRate =
            orderData.gstType === "INTERSTATE"
              ? Number(item.igst || 0)
              : Number(item.cgst || 0) + Number(item.sgst || 0);

          return taxRate <= 0;
        });

        if (hasInvalidTax) {
          return toast.error(
            "GST rate is mandatory for all items when GST Type is not NONE.",
          );
        }
      }
    }

    const payload = {
      purchaseOrderId: orderData.id,
      supplierId: supplier?.id,
      orderNumber: orderData.orderNumber,
      orderDate: getISTDateString(orderData.orderDate),
      billNumber: billNumber,
      billDate: billDate,
      vehicleNumber: vehicleNumber,
      gstType: orderData.gstType,
      items: items.map((item) => ({
        productId: item.productId,
        hsn: item.hsn,
        name: item.name,
        qty: Number(item.qty),
        receivedQty: Number(item.receivedQty),
        basePrice: Number(item.basePrice),
        conversionRate: Number(item.conversionRate) || 1,
        unit: item.unit || "unit",
        size: item.size,
        price: Number(item.price),
        discPercent: Number(item.discPercent),
        cgst: Number(item.cgst),
        sgst: Number(item.sgst),
        igst: Number(item.igst),
        taxableValue: Number(item.taxableValue),
        gstAmount: Number(item.gstAmount),
        priceAfterGst: Number(item.priceAfterGst),
        buyingPrice: Number(item.buyingPrice || 0),
        sellingPrice: Number(item.sellingPrice || 0),
      })),
      subtotal: Number(totals.subtotal),
      totalGstAmount: Number(totals.totalGst),
      freight: Number(freight),
      discount: Number(discountAmount),
      totalAmount: Number(totals.grandTotal),
      amountPaid: Number(amountPaid),
      paymentMode: paymentMode,
      referenceNo: referenceNo,
      receiveDate: new Date().toISOString(),
    };

    onSubmit(payload);
  };

  const handlePaymentSubmit = async () => {
    const remainingBalance = Number(bill?.balanceAmount);

    if (paymentForm.amount <= 0) {
      return toast.error("Please Enter a valid amount!");
    }

    if (paymentForm.amount > remainingBalance) {
      return toast.error(
        `Amount is greater than Balance (₹${remainingBalance})`,
      );
    }

    try {
      const payload = {
        billId: bill.id,
        supplierId: bill.supplierId,
        amount: paymentForm.amount,
        method: paymentForm.method,
        paymentDate: paymentForm.paymentDate,
        referenceNumber: paymentForm.referenceNumber,
      };

      await addBillPayment(payload).unwrap();

      toast.success("Payment Entry Saved!");

      setIsAddingPayment(false);
      setPaymentForm({
        amount: 0,
        method: "CASH",
        referenceNumber: "",
        paymentDate: getISTDateString(new Date()),
      });
      onClose();
    } catch (error) {
      toast.error("Failed to add payment!");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deleteBillPayment(paymentId).unwrap();
      toast.success("Payment Entry Deleted & Balance Updated!");
      onClose();
    } catch (error) {
      toast.error("Failed to delete payment!");
    }
  };

  const columns = [
    { label: "Item Name", align: "start" as const },
    { label: "HSN", align: "start" as const },
    { label: "Ordered", align: "center" as const },
    { label: "Received", align: "start" as const },
    { label: "Rate/Conv.", align: "end" as const },
    { label: "Disc%", align: "end" as const },
    ...(orderData?.gstType === "LOCAL"
      ? [
          { label: "CGST", align: "end" as const },
          { label: "SGST", align: "end" as const },
        ]
      : orderData?.gstType === "INTERSTATE"
        ? [{ label: "IGST", align: "end" as const }]
        : []),
    ...(isReadOnly
      ? [{ label: "Total", align: "end" as const }]
      : [
          { label: "Buying Price", align: "end" as const },
          { label: "Selling Price", align: "end" as const },
          { label: "Total", align: "end" as const },
        ]),
  ];

  return (
    <CustomDialog
      title="Receive Purchase Order (Purchase Bill)"
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      confirmLabel={isReadOnly ? undefined : "Confirm Receipt"}
      size="90%"
      onConfirm={isReadOnly ? undefined : handleConfirm}
      loading={isLoading}
    >
      <Stack gap={6} py={2}>
        <Box
          p={5}
          bg="brand.50"
          borderRadius="xl"
          border="1px solid"
          borderColor="brand.200"
          shadow="sm"
        >
          <HStack
            justify="space-between"
            mb={4}
            borderBottom="1px dashed"
            borderColor="brand.300"
            pb={2}
          >
            <Text
              fontWeight="extrabold"
              fontSize="md"
              color="brand.800"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              Supplier Information
            </Text>
            {isReadOnly && bill && (
              <Tooltip content="Download Purchase Bill">
                <IconButton
                  size="xs"
                  colorPalette="red"
                  variant="solid"
                  onClick={() =>
                    generateSupplierPDF(bill, supplier, "BILL", orderData)
                  }
                >
                  <MdPictureAsPdf />
                </IconButton>
              </Tooltip>
            )}
          </HStack>
          <Grid templateColumns="repeat(4, 1fr)" gap={6}>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="brand.600" fontWeight="bold">
                NAME
              </Text>
              <Text fontWeight="bold" fontSize="sm" textTransform="capitalize">
                {supplier?.name}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="brand.600" fontWeight="bold">
                CONTACT
              </Text>
              <Text fontWeight="bold" fontSize="sm">
                {supplier?.mobile}
              </Text>
              <Text fontSize="xs">{supplier?.email || "No Email"}</Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="brand.600" fontWeight="bold">
                GSTIN
              </Text>
              <Text fontWeight="bold" fontSize="sm" textTransform="uppercase">
                {supplier?.gstNumber || "N/A"}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="brand.600" fontWeight="bold">
                ADDRESS
              </Text>
              <Text fontWeight="bold" fontSize="sm">
                {supplier?.address}
              </Text>
            </VStack>
          </Grid>
        </Box>

        <Stack
          gap={4}
          p={4}
          bg="orange.50"
          borderRadius="md"
          border="1px solid"
          borderColor="orange.200"
        >
          <Grid templateColumns="repeat(3, 1fr)" gap={4}>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="orange.700">
                PO Number
              </Text>
              <Text fontWeight="bold" fontSize="sm">
                {orderData?.orderNumber}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="orange.700">
                PO Date
              </Text>
              <Text fontWeight="bold" fontSize="sm">
                {formatDate(orderData?.orderDate)}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="orange.700">
                GST Type
              </Text>
              <Text fontWeight="bold" fontSize="sm">
                {orderData?.gstType || "N/A"}
              </Text>
            </VStack>
          </Grid>
          <Separator borderColor="orange.300" />
          <Grid templateColumns="repeat(3, 1fr)" gap={4}>
            <Field.Root>
              <Field.Label fontSize="xs">Bill / Invoice Number</Field.Label>
              <Input
                size="sm"
                bg="white"
                placeholder="Enter Bill No."
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                readOnly={isReadOnly}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs">Bill Date</Field.Label>
              <Input
                size="sm"
                type="date"
                bg="white"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                readOnly={isReadOnly}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label fontSize="xs">Vehicle Number</Field.Label>
              <Input
                size="sm"
                bg="white"
                placeholder="RJ-14-XX-0000"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                readOnly={isReadOnly}
              />
            </Field.Root>
          </Grid>
        </Stack>

        <Grid templateColumns="repeat(2, 1fr)" gap={6}>
          <Box
            p={4}
            bg="white"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontWeight="bold" mb={2} fontSize="sm" color="brand.700">
              Billing Details (Buyer)
            </Text>
            <VStack align="start" gap={1} fontSize="xs">
              <Text>
                <b>Company:</b> {orderData?.billingName}
              </Text>
              <Text>
                <b>Mobile:</b> {orderData?.billingMobile || "N/A"}
              </Text>
              <Text>
                <b>Email:</b> {orderData?.billingEmail || "N/A"}
              </Text>
              <Text>
                <b>GSTIN:</b> {orderData?.billingGst || "N/A"}
              </Text>
              <Text>
                <b>Address:</b> {orderData?.billingAddress}
              </Text>
            </VStack>
          </Box>
          <Box
            p={4}
            bg="white"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <Text fontWeight="bold" mb={2} fontSize="sm" color="brand.700">
              Shipping Details
            </Text>
            <VStack align="start" gap={1} fontSize="xs">
              <Text>
                <b>To:</b> {orderData?.shippingName}
              </Text>
              <Text>
                <b>Mobile:</b> {orderData?.shippingMobile || "N/A"}
              </Text>
              <Text>
                <b>Email:</b> {orderData?.shippingEmail || "N/A"}
              </Text>
              <Text>
                <b>GSTIN:</b> {orderData?.shippingGst || "N/A"}
              </Text>
              <Text>
                <b>Address:</b> {orderData?.shippingAddress}
              </Text>
            </VStack>
          </Box>
        </Grid>

        <CustomTable
          columns={columns}
          data={items}
          renderRow={(item) => {
            const originalItem = orderData?.items?.find(
              (i: any) => i.id === item.id,
            );
            return (
              <Table.Row key={item.id}>
                <Table.Cell fontSize="sm" fontWeight="medium">
                  {item.name}
                </Table.Cell>
                <Table.Cell>
                  <VStack gap={1} align="stretch" justify="center" minH="55px">
                    <Input
                      size="sm"
                      bg="white"
                      borderColor="brand.100"
                      placeholder="HSN Code"
                      value={item.hsn || ""}
                      onChange={(e) =>
                        updateItemField(item.id, "hsn", e.target.value)
                      }
                      readOnly={isReadOnly}
                    />
                    <Text fontSize="10px" color="gray.500">
                      Orig: {originalItem?.hsn || "N/A"}
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell textAlign="center">
                  <VStack gap={0} justify="center" minH="55px">
                    <Text fontWeight="bold" color="gray.600">
                      {Number(item.qty)}
                    </Text>
                    <Text fontSize="10px" color="transparent">
                      spacer
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell>
                  <VStack gap={1} align="stretch" justify="center" minH="55px">
                    <Input
                      type="number"
                      size="sm"
                      bg="white"
                      borderColor="brand.200"
                      value={item.receivedQty === 0 ? "" : item.receivedQty}
                      onChange={(e) =>
                        updateItemField(item.id, "receivedQty", e.target.value)
                      }
                      min={0}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                      readOnly={isReadOnly}
                    />
                    <Text fontSize="10px" color="transparent">
                      spacer
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell>
                  <VStack gap={1} align="end" justify="center" minH="55px">
                    <Text fontWeight="bold" fontSize="sm">
                      ₹{Number(item.price).toFixed(2)}
                    </Text>
                    <HStack gap={1}>
                      <Input
                        type="number"
                        size="xs"
                        h="6"
                        w="60px"
                        bg="white"
                        value={item.basePrice === 0 ? "" : item.basePrice}
                        onChange={(e) =>
                          updateItemField(item.id, "basePrice", e.target.value)
                        }
                        min={0}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) =>
                          ["e", "E", "+", "-"].includes(e.key) &&
                          e.preventDefault()
                        }
                        readOnly={isReadOnly}
                      />
                      <Text fontSize="10px" color="gray.500">
                        x
                      </Text>
                      <Input
                        type="number"
                        size="xs"
                        h="6"
                        w="40px"
                        bg="white"
                        value={item.conversionRate}
                        onChange={(e) =>
                          updateItemField(
                            item.id,
                            "conversionRate",
                            e.target.value,
                          )
                        }
                        min={0}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) =>
                          ["e", "E", "+", "-"].includes(e.key) &&
                          e.preventDefault()
                        }
                        readOnly={isReadOnly}
                      />
                    </HStack>
                    <Text fontSize="10px" color="gray.500">
                      Orig: ₹{Number(originalItem?.price).toFixed(2)}{" "}
                      {`((${originalItem?.basePrice} X ${originalItem?.conversionRate}) - ${originalItem?.discPercent}%)`}
                    </Text>
                  </VStack>
                </Table.Cell>

                <Table.Cell>
                  <VStack gap={1} align="end" justify="center" minH="55px">
                    <Input
                      type="number"
                      size="sm"
                      bg="white"
                      w="80px"
                      color="red.500"
                      value={item.discPercent === 0 ? "" : item.discPercent}
                      onChange={(e) =>
                        updateItemField(item.id, "discPercent", e.target.value)
                      }
                      min={0}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                      readOnly={isReadOnly}
                    />
                    <Text fontSize="10px" color="gray.500">
                      Original: {Number(originalItem?.discPercent)}%
                    </Text>
                  </VStack>
                </Table.Cell>

                {orderData?.gstType === "LOCAL" ? (
                  <>
                    <Table.Cell>
                      <VStack gap={1} align="end" justify="center" minH="55px">
                        <Input
                          type="number"
                          size="xs"
                          w="60px"
                          value={item.cgst === 0 ? "" : item.cgst}
                          onChange={(e) =>
                            updateItemField(item.id, "cgst", e.target.value)
                          }
                          min={0}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onKeyDown={(e) =>
                            ["e", "E", "+", "-"].includes(e.key) &&
                            e.preventDefault()
                          }
                          readOnly={isReadOnly}
                        />
                        <Text fontSize="10px" color="gray.500">
                          Orig: {Number(originalItem?.cgst)}%
                        </Text>
                      </VStack>
                    </Table.Cell>
                    <Table.Cell>
                      <VStack gap={1} align="end" justify="center" minH="55px">
                        <Input
                          type="number"
                          size="xs"
                          w="60px"
                          value={item.sgst === 0 ? "" : item.sgst}
                          onChange={(e) =>
                            updateItemField(item.id, "sgst", e.target.value)
                          }
                          min={0}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onKeyDown={(e) =>
                            ["e", "E", "+", "-"].includes(e.key) &&
                            e.preventDefault()
                          }
                          readOnly={isReadOnly}
                        />
                        <Text fontSize="10px" color="gray.500">
                          Orig: {Number(originalItem?.sgst)}%
                        </Text>
                      </VStack>
                    </Table.Cell>
                  </>
                ) : orderData?.gstType === "INTERSTATE" ? (
                  <Table.Cell>
                    <VStack gap={1} align="end" justify="center" minH="55px">
                      <Input
                        type="number"
                        size="xs"
                        w="60px"
                        value={item.igst === 0 ? "" : item.igst}
                        onChange={(e) =>
                          updateItemField(item.id, "igst", e.target.value)
                        }
                        min={0}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) =>
                          ["e", "E", "+", "-"].includes(e.key) &&
                          e.preventDefault()
                        }
                        readOnly={isReadOnly}
                      />
                      <Text fontSize="10px" color="gray.500">
                        Orig: {Number(originalItem?.igst)}%
                      </Text>
                    </VStack>
                  </Table.Cell>
                ) : null}
                {!isReadOnly && (
                  <>
                    <Table.Cell textAlign="end">
                      <Input
                        type="number"
                        value={Number(item.buyingPrice || 0).toFixed(2)}
                        readOnly
                        variant="subtle"
                        bg="gray.50"
                        size="sm"
                        textAlign="end"
                      />
                    </Table.Cell>

                    <Table.Cell textAlign="end">
                      <Input
                        type="number"
                        value={item.sellingPrice || ""}
                        onChange={(e) =>
                          updateItemField(
                            item.id,
                            "sellingPrice",
                            e.target.value,
                          )
                        }
                        placeholder="0.00"
                        size="sm"
                        textAlign="end"
                      />
                    </Table.Cell>
                  </>
                )}

                <Table.Cell>
                  <VStack gap={1} align="end" justify="center" minH="55px">
                    <Text fontWeight="bold" color="blue.700">
                      ₹{Number(item.priceAfterGst || 0).toFixed(2)}
                    </Text>
                    <Text fontSize="10px" color="gray.400">
                      Orig: ₹{Number(originalItem?.priceAfterGst).toFixed(2)}
                    </Text>
                  </VStack>
                </Table.Cell>
              </Table.Row>
            );
          }}
        />

        <Separator />

        <Grid templateColumns="repeat(2, 1fr)" gap={8}>
          <VStack gap={4} align="stretch">
            <HStack justify="space-between" align="center">
              <Text fontWeight="bold" fontSize="sm">
                Payment & Reference
              </Text>
              {isReadOnly &&
                !isAddingPayment &&
                Number(bill?.balanceAmount) > 0 && (
                  <Button
                    size="xs"
                    colorPalette="blue"
                    variant="surface"
                    onClick={() => setIsAddingPayment(true)}
                  >
                    + Add Payment
                  </Button>
                )}
            </HStack>

            {!isReadOnly ? (
              <>
                <Box mb={4}>
                  <HStack justify="space-between" mb={1.5}>
                    <Text fontSize="xs" fontWeight="bold">
                      ADDITIONAL DISCOUNT (
                      {discountType === "amount" ? "₹" : "%"})
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
                        onClick={() => {
                          if (!isReadOnly) setDiscountType("amount");
                        }}
                      >
                        ₹
                      </Box>
                      <Box
                        px={2}
                        py={0.5}
                        fontSize="2xs"
                        fontWeight="bold"
                        cursor="pointer"
                        bg={
                          discountType === "percentage" ? "brand.600" : "white"
                        }
                        color={
                          discountType === "percentage" ? "white" : "gray.600"
                        }
                        onClick={() => {
                          if (!isReadOnly) setDiscountType("percentage");
                        }}
                      >
                        %
                      </Box>
                    </HStack>
                  </HStack>
                  <Input
                    type="number"
                    size="sm"
                    bg="white"
                    readOnly={isReadOnly}
                    value={localDiscount}
                    placeholder={discountType === "percentage" ? "0%" : "0.00"}
                    onChange={(e) =>
                      handleDiscountChange(discountType, e.target.value)
                    }
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onKeyDown={(e) =>
                      ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                    }
                  />
                </Box>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Field.Root>
                    <Field.Label fontSize="xs">Amount Paid</Field.Label>
                    <Input
                      type="number"
                      size="sm"
                      value={amountPaid === 0 ? "" : amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      min={0}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label fontSize="xs">Payment Mode</Field.Label>
                    <SelectRoot
                      size="sm"
                      collection={paymentMethods}
                      value={[paymentMode]}
                      onValueChange={(e) =>
                        e.value[0] && setPaymentMode(e.value[0])
                      }
                    >
                      <SelectTrigger>
                        <SelectValueText />
                      </SelectTrigger>
                      <SelectContent portalled={false}>
                        {paymentMethods.items.map((m) => (
                          <SelectItem item={m} key={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field.Root>
                </Grid>
                <Field.Root>
                  <Field.Label fontSize="xs">Reference No.</Field.Label>
                  <Input
                    size="sm"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UTR, Cheque No, etc."
                  />
                </Field.Root>
              </>
            ) : (
              <>
                {isAddingPayment && (
                  <Box
                    p={4}
                    bg="blue.50"
                    borderRadius="lg"
                    border="1px dashed"
                    borderColor="blue.300"
                  >
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <Field.Root>
                        <Field.Label fontSize="xs">Amount</Field.Label>
                        <Input
                          type="number"
                          size="sm"
                          bg="white"
                          value={paymentForm.amount || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const balance = Number(bill?.balanceAmount);
                            if (val > balance) {
                              toast.error("Amount cannot exceed balance!");
                              setPaymentForm({
                                ...paymentForm,
                                amount: balance,
                              });
                            } else {
                              setPaymentForm({ ...paymentForm, amount: val });
                            }
                          }}
                          placeholder={`Max: ${Number(bill?.balanceAmount)?.toFixed(2)}`}
                        />
                        {paymentForm.amount > Number(bill?.balanceAmount) && (
                          <Field.ErrorText fontSize="10px">
                            Max payable is ₹
                            {Number(bill?.balanceAmount)?.toFixed(2)}
                          </Field.ErrorText>
                        )}
                      </Field.Root>
                      <Field.Root>
                        <Field.Label fontSize="xs">Date</Field.Label>
                        <Input
                          type="date"
                          size="sm"
                          bg="white"
                          value={paymentForm.paymentDate}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              paymentDate: e.target.value,
                            })
                          }
                        />
                      </Field.Root>
                      <Field.Root>
                        <Field.Label fontSize="xs">Method</Field.Label>
                        <SelectRoot
                          size="sm"
                          collection={paymentMethods}
                          value={[paymentForm.method]}
                          onValueChange={(e) =>
                            e.value[0] &&
                            setPaymentForm({
                              ...paymentForm,
                              method: e.value[0],
                            })
                          }
                        >
                          <SelectTrigger bg="white">
                            <SelectValueText />
                          </SelectTrigger>
                          <SelectContent portalled={false}>
                            {paymentMethods.items.map((m) => (
                              <SelectItem item={m} key={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </SelectRoot>
                      </Field.Root>
                      <Field.Root>
                        <Field.Label fontSize="xs">Ref No.</Field.Label>
                        <Input
                          size="sm"
                          bg="white"
                          value={paymentForm.referenceNumber}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              referenceNumber: e.target.value,
                            })
                          }
                        />
                      </Field.Root>
                    </Grid>
                    <HStack mt={4} justify="flex-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setIsAddingPayment(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="xs"
                        colorPalette="blue"
                        loading={isSubmittingPayment}
                        onClick={handlePaymentSubmit}
                      >
                        Save
                      </Button>
                    </HStack>
                  </Box>
                )}

                {bill?.payments?.length > 0 && (
                  <Box
                    p={4}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="gray.200"
                    bg="white"
                    shadow="sm"
                  >
                    <Text
                      fontWeight="bold"
                      mb={3}
                      fontSize="sm"
                      color="brand.700"
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      <MdReceipt /> Payment History
                    </Text>
                    <CustomTable
                      columns={[
                        { label: "Date", align: "start" },
                        { label: "Method", align: "start" },
                        { label: "Ref No", align: "start" },
                        { label: "Amount", align: "start" },
                        { label: "Action", align: "end" },
                      ]}
                      data={bill.payments}
                      renderRow={(p: any) => (
                        <Table.Row key={p.id}>
                          <Table.Cell fontSize="xs">
                            {formatDate(p.paymentDate)}
                          </Table.Cell>
                          <Table.Cell fontSize="xs">
                            <Badge
                              size="sm"
                              variant="outline"
                              colorPalette="blue"
                            >
                              {p.method}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell fontSize="xs">
                            {p.referenceNumber.trim() !== ""
                              ? p.referenceNumber
                              : "N/A"}
                          </Table.Cell>
                          <Table.Cell
                            fontSize="xs"
                            fontWeight="bold"
                            color="green.600"
                          >
                            ₹{Number(p.amount).toFixed(2)}
                          </Table.Cell>
                          <Table.Cell textAlign="end">
                            <IconButton
                              size="xs"
                              variant="ghost"
                              colorPalette="red"
                              aria-label="Delete Payment"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePayment(p.id);
                              }}
                              loading={isDeletingPayment}
                            >
                              <MdDelete />
                            </IconButton>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    />
                  </Box>
                )}
              </>
            )}
          </VStack>

          <Flex justify="flex-end">
            <Box
              w="350px"
              p={4}
              bg="gray.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
            >
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between" color="gray.600">
                  <Text fontSize="xs">PO Total (Original)</Text>
                  <Text fontSize="xs">
                    ₹{Number(orderData?.totalAmount || 0).toFixed(2)}
                  </Text>
                </HStack>
                <Separator my={1} />
                <HStack justify="space-between">
                  <Text fontSize="sm">Items Received Total</Text>
                  <Text fontSize="sm">
                    ₹
                    {Number(
                      Number(totals.subtotal) + Number(totals.totalGst),
                    ).toFixed(2)}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Freight Charges</Text>
                  <Input
                    w="100px"
                    size="xs"
                    type="number"
                    value={freight === 0 ? "" : freight}
                    onChange={(e) => setFreight(Number(e.target.value))}
                    bg="white"
                    readOnly={isReadOnly}
                  />
                </HStack>
                <Separator my={1} />
                <HStack justify="space-between">
                  <Text fontWeight="bold">Grand Total (Received)</Text>
                  <Text fontWeight="bold" fontSize="lg" color="brand.600">
                    ₹{Number(totals.grandTotal).toFixed(2)}
                  </Text>
                </HStack>

                <HStack justify="space-between" color="red.600">
                  <Text fontSize="sm" fontWeight="bold">
                    Additional Discount (-)
                  </Text>
                  <Text fontWeight="bold">
                    ₹
                    {Number(
                      isReadOnly ? bill?.discount || 0 : discountAmount,
                    ).toFixed(2)}
                  </Text>
                </HStack>

                {isReadOnly && (
                  <HStack justify="space-between" color="green.600">
                    <Text fontSize="sm" fontWeight="bold">
                      Total Paid
                    </Text>
                    <Text fontWeight="bold">
                      ₹{Number(bill?.amountPaid || 0).toFixed(2)}
                    </Text>
                  </HStack>
                )}

                <HStack
                  justify="space-between"
                  color="orange.600"
                  fontSize="sm"
                >
                  <Text>
                    {isReadOnly ? "Final Balance" : "Remaining Balance"}
                  </Text>
                  <Text fontWeight="bold" fontSize="lg">
                    ₹
                    {isReadOnly
                      ? Number(
                          Number(bill?.totalAmount) -
                            Number(bill?.discount || 0) -
                            Number(bill?.amountPaid || 0),
                        ).toFixed(2)
                      : Number(
                          Number(totals.grandTotal) -
                            Number(discountAmount) -
                            Number(amountPaid),
                        ).toFixed(2)}
                  </Text>
                </HStack>
              </VStack>
            </Box>
          </Flex>
        </Grid>
      </Stack>
    </CustomDialog>
  );
};
