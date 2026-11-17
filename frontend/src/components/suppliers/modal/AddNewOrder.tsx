import {
  Stack,
  Input,
  Field,
  Text,
  Box,
  Grid,
  HStack,
  VStack,
  IconButton,
  Table,
  Flex,
  createListCollection,
  Separator,
} from "@chakra-ui/react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useMemo, useEffect } from "react";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { MdDelete } from "react-icons/md";
import { getISTDateString } from "@/utils/dateUtils";
import { toast } from "@/utils/toast";
import { CustomTable } from "@/components/ui/CustomTable";
import { Supplier } from "@/types/supplier";
import { CompanyDetails } from "@/types/settings";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  supplier: Supplier | null;
  products: any[];
  myCompanyDetails?: CompanyDetails;
  mode?: "add" | "view" | "edit";
  orderData?: any;
}
const getCalculatedItem = (item: any, gstType: string) => {
  const qty = Math.max(0, Number(item.qty) || 0);
  const rawConversion = item.conversionRate;
  const cRate =
    rawConversion === "" ? 1 : Math.max(0, Number(rawConversion) || 1);
  const bPrice = Math.max(0, Number(item.basePrice) || 0);
  const discPercent = Math.min(100, Math.max(0, Number(item.discPercent) || 0));

  const priceBeforeDisc = bPrice * cRate;
  const finalPrice = priceBeforeDisc - (priceBeforeDisc * discPercent) / 100;
  const taxableValue = finalPrice * qty;

  const cgst = Math.max(0, Number(item.cgst) || 0);
  const sgst = Math.max(0, Number(item.sgst) || 0);
  const igst = Math.max(0, Number(item.igst) || 0);

  const totalRate = gstType === "LOCAL" ? cgst + sgst : igst;
  const gstAmount = (taxableValue * totalRate) / 100;
  const priceAfterGst = taxableValue + gstAmount;

  return {
    ...item,
    qty,
    basePrice: bPrice,
    conversionRate: rawConversion,
    price: finalPrice,
    discPercent,
    cgst,
    sgst,
    igst,
    taxableValue,
    gstAmount,
    priceAfterGst,
  };
};

export const AddNewOrder = ({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  products,
  myCompanyDetails,
  orderData,
  mode: initialMode = "add",
}: Props) => {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [formData, setFormData] = useState<any>({
    billingName: myCompanyDetails?.name || "",
    billingEmail: myCompanyDetails?.email || "",
    billingMobile: myCompanyDetails?.mobile || "",
    billingGst: myCompanyDetails?.gstNumber || "",
    billingAddress: myCompanyDetails?.address || "",
    shippingName: "",
    shippingEmail: "",
    shippingMobile: "",
    shippingGst: "",
    shippingAddress: "",
    poNumber: "",
    poDate: getISTDateString(new Date()),
    gstType: "LOCAL" as "LOCAL" | "INTERSTATE" | "NONE",
    transportName: "",
    transportContact: "",
    lrNumber: "",
    transportMode: "ROAD",
    expectedDeliveryDate: "",
    freightAmount: 0,
    transportNotes: "",
  });

  const [poMode, setPoMode] = useState<"AUTO" | "MANUAL">("AUTO");
  const [isShippingSame, setIsShippingSame] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    null,
  );

  const autoPONumber = useMemo(() => `PO-${Date.now()}`, [isOpen]);
  const isReadOnly = currentMode === "view";

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (currentMode !== "add") return;

    if (isShippingSame) {
      setFormData((prev: any) => ({
        ...prev,
        shippingName: prev.billingName,
        shippingEmail: prev.billingEmail,
        shippingMobile: prev.billingMobile,
        shippingGst: prev.billingGst,
        shippingAddress: prev.billingAddress,
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        shippingName: "",
        shippingEmail: "",
        shippingMobile: "",
        shippingGst: "",
        shippingAddress: "",
      }));
    }
  }, [
    isShippingSame,
    currentMode,
    formData.billingName,
    formData.billingAddress,
    formData.billingGst,
    formData.billingMobile,
    formData.billingEmail,
  ]);

  useEffect(() => {
    if (isOpen) {
      if ((currentMode === "view" || currentMode === "edit") && orderData) {
        setFormData({
          billingName: orderData.billingName || "",
          billingEmail: orderData.billingEmail || "",
          billingMobile: orderData.billingMobile || "",
          billingGst: orderData.billingGst || "",
          billingAddress: orderData.billingAddress || "",
          shippingName: orderData.shippingName || "",
          shippingEmail: orderData.shippingEmail || "",
          shippingMobile: orderData.shippingMobile || "",
          shippingGst: orderData.shippingGst || "",
          shippingAddress: orderData.shippingAddress || "",
          poNumber: orderData.orderNumber || "",
          poDate: getISTDateString(new Date(orderData.orderDate)),
          gstType: orderData.gstType || "LOCAL",
          transportName: orderData.transportName || orderData.transport_name || "",
          transportContact: orderData.transportContact || orderData.transport_contact || "",
          lrNumber: orderData.lrNumber || orderData.lr_number || "",
          transportMode: orderData.transportMode || orderData.transport_mode || "ROAD",
          expectedDeliveryDate: orderData.expectedDeliveryDate
            ? getISTDateString(new Date(orderData.expectedDeliveryDate))
            : orderData.expected_delivery_date
              ? getISTDateString(new Date(orderData.expected_delivery_date))
              : "",
          freightAmount: Number(orderData.freightAmount ?? orderData.freight_amount ?? 0),
          transportNotes: orderData.transportNotes || orderData.transport_notes || "",
        });

        const normalizedItems = (orderData.items || []).map((i: any) => ({
          id: i.id || Date.now().toString() + Math.random().toString(),
          productId: i.productId || "",
          name: i.name || "",
          hsn: i.hsn || "",
          qty: Number(i.qty) || 0,
          basePrice: Number(i.basePrice || 0),
          conversionRate: Number(i.conversionRate || 1),
          unit: i.unit || "unit",
          size: i.size,
          price: Number(i.price) || 0,
          discPercent: Number(i.discPercent || 0),
          cgst: Number(i.cgst || 0),
          sgst: Number(i.sgst || 0),
          igst: Number(i.igst || 0),
          gstAmount: Number(i.gstAmount || 0),
          priceAfterGst: Number(i.priceAfterGst || 0),
          taxableValue: Number(
            i.taxableValue || Number(i.qty) * Number(i.price),
          ),
          showSuggestions: false,
        }));
        setSelectedItems(normalizedItems);
        const isSame =
          orderData.billingName === orderData.shippingName &&
          orderData.billingAddress === orderData.shippingAddress;
        setIsShippingSame(isSame);
      } else if (currentMode === "add") {
        setFormData({
          billingName: myCompanyDetails?.name || "",
          billingEmail: myCompanyDetails?.email || "",
          billingMobile: myCompanyDetails?.mobile || "",
          billingGst: myCompanyDetails?.gstNumber || "",
          billingAddress: myCompanyDetails?.address || "",
          shippingName: "",
          shippingEmail: "",
          shippingMobile: "",
          shippingGst: "",
          shippingAddress: "",
          poNumber: "",
          poDate: getISTDateString(new Date()),
          gstType: "LOCAL",
          transportName: "",
          transportContact: "",
          lrNumber: "",
          transportMode: "ROAD",
          expectedDeliveryDate: "",
          freightAmount: 0,
          transportNotes: "",
        });
        setSelectedItems([]);
        setPoMode("AUTO");
      }
    }
  }, [isOpen, orderData, currentMode, myCompanyDetails]);

  const gstTypeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "No GST", value: "NONE" },
          { label: "Local (CGST + SGST)", value: "LOCAL" },
          { label: "Interstate (IGST)", value: "INTERSTATE" },
        ],
      }),
    [],
  );

  const gstRateCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "5%", value: "5" },
          { label: "9%", value: "9" },
          { label: "18%", value: "18" },
        ],
      }),
    [],
  );

  const transportModeCollection = useMemo(
    () =>
      createListCollection({
        items: [
          { label: "Road", value: "ROAD" },
          { label: "Rail", value: "RAIL" },
          { label: "Air", value: "AIR" },
          { label: "Sea", value: "SEA" },
          { label: "Courier", value: "COURIER" },
        ],
      }),
    [],
  );

  const updateItem = (id: string, updates: any) => {
    setSelectedItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const updated = [...prev];
      let item = { ...updated[index], ...updates };

      if ("discPercent" in updates && Number(updates.discPercent) > 100) {
        toast.warning("Discount cannot exceed 100%");
        item.discPercent = 100;
      }

      updated[index] = getCalculatedItem(item, formData.gstType);
      return updated;
    });
  };

  const handleAddRow = () => {
    setSelectedItems([
      ...selectedItems,
      getCalculatedItem(
        {
          id: Date.now().toString() + Math.random().toString(),
          name: "",
          hsn: "",
          qty: 1,
          basePrice: 0,
          price: 0,
          conversionRate: 1,
          unit: "PCS",
          size: "",
          discPercent: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          gstAmount: 0,
          priceAfterGst: 0,
          taxableValue: 0,
          productId: "",
          showSuggestions: false,
        },
        formData.gstType,
      ),
    ]);
  };

  const handleConfirm = () => {
    const finalPo = poMode === "AUTO" ? autoPONumber : formData.poNumber;

    if (!finalPo) return toast.error("PO Number is required");
    if (selectedItems.length === 0) return toast.error("Add at least one item");

    for (const item of selectedItems) {
      if (Number(item.qty || 0) <= 0)
        return toast.error(`Quantity is required for ${item.name}`);
      if (Number(item.basePrice || 0) <= 0)
        return toast.error(`Price is required for ${item.name}`);

      if (formData.gstType !== "NONE") {
        if (Number(item.gstAmount) <= 0) {
          return toast.error(`GST calculation missing for ${item.name}.`);
        }
        if (
          formData.gstType === "LOCAL" &&
          (Number(item.cgst) <= 0 || Number(item.sgst) <= 0)
        ) {
          return toast.error(`CGST/SGST values are required for ${item.name}`);
        }
        if (formData.gstType === "INTERSTATE" && Number(item.igst) <= 0) {
          return toast.error(`IGST value is required for ${item.name}`);
        }
      }
    }

    const payload = {
      ...formData,
      id: currentMode === "add" ? undefined : orderData?.id,
      orderNumber: finalPo,
      orderDate: formData.poDate,
      supplierId: supplier?.id,
      subtotal: totals.subtotal,
      totalGstAmount: totals.totalGst,
      totalAmount: totals.grandTotal,
      items: selectedItems,
    };

    onSubmit(payload);
  };

  const totals = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => ({
        subtotal: acc.subtotal + (item.taxableValue || 0),
        totalGst: acc.totalGst + (item.gstAmount || 0),
        grandTotal: acc.grandTotal + (item.priceAfterGst || 0),
      }),
      { subtotal: 0, totalGst: 0, grandTotal: 0 },
    );
  }, [selectedItems]);

  const columns = [
    { label: "Item Name", align: "start" as const },
    { label: "HSN", align: "start" as const },
    { label: "Qty", align: "start" as const, width: "80px" },
    { label: "Conv.", align: "start" as const, width: "80px" },
    { label: "Rate", align: "start" as const, width: "130px" },
    { label: "Disc%", align: "start" as const, width: "80px" },
    { label: "GST %", align: "start" as const, width: "110px" },
    ...(formData.gstType === "LOCAL"
      ? [
          { label: "CGST %", align: "start" as const, width: "90px" },
          { label: "SGST %", align: "start" as const, width: "90px" },
        ]
      : []),
    ...(formData.gstType === "INTERSTATE"
      ? [{ label: "IGST %", align: "start" as const, width: "90px" }]
      : []),
    { label: "Total", align: "end" as const, width: "120px" },
    ...(!isReadOnly
      ? [{ label: "", align: "center" as const, width: "50px" }]
      : []),
  ];

  return (
    <CustomDialog
      title={
        currentMode === "add"
          ? "Create Purchase Order"
          : currentMode === "view"
            ? "Order Details"
            : "Edit Purchase Order"
      }
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      confirmLabel={
        currentMode === "view"
          ? undefined
          : currentMode === "edit"
            ? "Update Order"
            : "Save Order"
      }
      size="90%"
      onConfirm={isReadOnly ? undefined : handleConfirm}
    >
      <Stack gap={6} py={2}>
        <Box
          p={4}
          bg="gray.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
        >
          <Grid templateColumns="repeat(3, 1fr)" gap={4}>
            <VStack align="start" gap={0}>
              <Text fontWeight="bold" textTransform="capitalize">
                {supplier?.name}
              </Text>
              <Text fontSize="xs">Supplier</Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontWeight="bold">{supplier?.mobile}</Text>
              <Text fontSize="xs">Mobile</Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontWeight="bold">{supplier?.email}</Text>
              <Text fontSize="xs">Email</Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontWeight="bold">{supplier?.address}</Text>
              <Text fontSize="xs">Address</Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontWeight="bold" textTransform="uppercase">
                {supplier?.gstNumber || "N/A"}
              </Text>
              <Text fontSize="xs">GSTIN</Text>
            </VStack>
          </Grid>
        </Box>

        <Grid
          templateColumns="repeat(3, 1fr)"
          gap={4}
          p={4}
          bg="blue.50"
          borderRadius="md"
        >
          <Field.Root>
            <Field.Label>PO Number</Field.Label>
            {currentMode === "add" ? (
              <>
                <HStack gap={4} mb={2}>
                  <Checkbox
                    checked={poMode === "AUTO"}
                    onCheckedChange={(e) =>
                      setPoMode(e.checked ? "AUTO" : "MANUAL")
                    }
                  >
                    Auto
                  </Checkbox>
                  <Checkbox
                    checked={poMode === "MANUAL"}
                    onCheckedChange={(e) =>
                      setPoMode(e.checked ? "MANUAL" : "AUTO")
                    }
                  >
                    Manual
                  </Checkbox>
                </HStack>
                {poMode === "MANUAL" ? (
                  <Input
                    size="sm"
                    placeholder="Enter PO Number"
                    value={formData.poNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, poNumber: e.target.value })
                    }
                    bg="white"
                  />
                ) : (
                  <Text fontSize="sm" fontWeight="bold" color="blue.700">
                    {autoPONumber}
                  </Text>
                )}
              </>
            ) : (
              <Box py={1}>
                <Text fontSize="sm" fontWeight="bold" color="blue.700">
                  {formData.poNumber}
                </Text>
              </Box>
            )}
          </Field.Root>
          <Field.Root>
            <Field.Label>PO Date</Field.Label>
            <Input
              type="date"
              value={formData.poDate}
              onChange={(e) =>
                setFormData({ ...formData, poDate: e.target.value })
              }
              bg="white"
              readOnly={isReadOnly}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>Tax Type</Field.Label>
            <SelectRoot
              collection={gstTypeCollection}
              value={[formData.gstType]}
              onValueChange={(e) =>
                setFormData({ ...formData, gstType: e.value[0] as any })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger bg="white">
                <SelectValueText />
              </SelectTrigger>
              <SelectContent portalled={false}>
                {gstTypeCollection.items.map((i) => (
                  <SelectItem item={i} key={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Field.Root>
        </Grid>

        <Grid templateColumns="repeat(2, 1fr)" gap={8}>
          <Stack gap={3}>
            <Text
              fontWeight="bold"
              borderBottom="1px solid"
              borderColor="gray.200"
            >
              Billing Details (Buyer)
            </Text>
            <Input
              placeholder="Company Name"
              value={formData.billingName}
              onChange={(e) =>
                setFormData({ ...formData, billingName: e.target.value })
              }
              readOnly={isReadOnly}
            />
            <Grid templateColumns="repeat(2, 1fr)" gap={2}>
              <Input
                placeholder="Mobile"
                value={formData.billingMobile}
                onChange={(e) =>
                  setFormData({ ...formData, billingMobile: e.target.value })
                }
                readOnly={isReadOnly}
              />
              <Input
                placeholder="Email"
                value={formData.billingEmail}
                onChange={(e) =>
                  setFormData({ ...formData, billingEmail: e.target.value })
                }
                readOnly={isReadOnly}
              />
            </Grid>
            <Input
              placeholder="GST Number"
              value={formData.billingGst}
              onChange={(e) =>
                setFormData({ ...formData, billingGst: e.target.value })
              }
              readOnly={isReadOnly}
            />
            <Input
              placeholder="Address"
              value={formData.billingAddress}
              onChange={(e) =>
                setFormData({ ...formData, billingAddress: e.target.value })
              }
              readOnly={isReadOnly}
            />
          </Stack>

          <Stack gap={3}>
            <HStack justify="space-between">
              <Text
                fontWeight="bold"
                borderBottom="1px solid"
                borderColor="gray.200"
              >
                Shipping Details
              </Text>
              <Checkbox
                checked={isShippingSame}
                onCheckedChange={(e) => setIsShippingSame(!!e.checked)}
                disabled={isReadOnly}
              >
                Same as Billing
              </Checkbox>
            </HStack>
            <Input
              placeholder="Name"
              value={formData.shippingName}
              readOnly={isShippingSame || isReadOnly}
              onChange={(e) =>
                setFormData({ ...formData, shippingName: e.target.value })
              }
            />
            <Grid templateColumns="repeat(2, 1fr)" gap={2}>
              <Input
                placeholder="Mobile"
                value={formData.shippingMobile}
                readOnly={isShippingSame || isReadOnly}
                onChange={(e) =>
                  setFormData({ ...formData, shippingMobile: e.target.value })
                }
              />
              <Input
                placeholder="Email"
                value={formData.shippingEmail}
                readOnly={isShippingSame || isReadOnly}
                onChange={(e) =>
                  setFormData({ ...formData, shippingEmail: e.target.value })
                }
              />
            </Grid>
            <Input
              placeholder="GSTIN"
              value={formData.shippingGst}
              readOnly={isShippingSame || isReadOnly}
              onChange={(e) =>
                setFormData({ ...formData, shippingGst: e.target.value })
              }
            />
            <Input
              placeholder="Address"
              value={formData.shippingAddress}
              readOnly={isShippingSame || isReadOnly}
              onChange={(e) =>
                setFormData({ ...formData, shippingAddress: e.target.value })
              }
            />
          </Stack>
        </Grid>

        <Box
          p={4}
          bg="gray.50"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight="bold" mb={3} color="brand.800">
            Transport & Logistics Details
          </Text>
          <Grid templateColumns="repeat(3, 1fr)" gap={3}>
            <Field.Root>
              <Field.Label fontSize="xs">Transport / Transporter Name</Field.Label>
              <Input
                size="sm"
                placeholder="e.g. VRL Logistics, SafeX"
                value={formData.transportName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, transportName: e.target.value })
                }
                readOnly={isReadOnly}
                bg="white"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Transport Contact / Driver No.</Field.Label>
              <Input
                size="sm"
                placeholder="e.g. 9876543210"
                value={formData.transportContact || ""}
                onChange={(e) =>
                  setFormData({ ...formData, transportContact: e.target.value })
                }
                readOnly={isReadOnly}
                bg="white"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">LR / Bilty Number</Field.Label>
              <Input
                size="sm"
                placeholder="Lorry Receipt No."
                value={formData.lrNumber || ""}
                onChange={(e) =>
                  setFormData({ ...formData, lrNumber: e.target.value })
                }
                readOnly={isReadOnly}
                bg="white"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Transport Mode</Field.Label>
              <SelectRoot
                collection={transportModeCollection}
                value={[formData.transportMode || "ROAD"]}
                onValueChange={(e) =>
                  setFormData({ ...formData, transportMode: e.value[0] || "ROAD" })
                }
                disabled={isReadOnly}
                size="sm"
              >
                <SelectTrigger bg="white">
                  <SelectValueText />
                </SelectTrigger>
                <SelectContent portalled={false}>
                  {transportModeCollection.items.map((i) => (
                    <SelectItem item={i} key={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Expected Delivery Date</Field.Label>
              <Input
                size="sm"
                type="date"
                value={formData.expectedDeliveryDate || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedDeliveryDate: e.target.value,
                  })
                }
                readOnly={isReadOnly}
                bg="white"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontSize="xs">Freight Amount (₹)</Field.Label>
              <Input
                size="sm"
                type="number"
                min={0}
                placeholder="0"
                value={formData.freightAmount ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    freightAmount: Number(e.target.value) || 0,
                  })
                }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                readOnly={isReadOnly}
                bg="white"
              />
            </Field.Root>
          </Grid>

          <Field.Root mt={3}>
            <Field.Label fontSize="xs">Transport / Delivery Notes</Field.Label>
            <Input
              size="sm"
              placeholder="e.g. Delivery at godown gate #2, fragile items"
              value={formData.transportNotes || ""}
              onChange={(e) =>
                setFormData({ ...formData, transportNotes: e.target.value })
              }
              readOnly={isReadOnly}
              bg="white"
            />
          </Field.Root>
        </Box>

        <Separator />

        <Flex justify="space-between" align="center">
          <Text fontWeight="bold" fontSize="lg">
            PO Items
          </Text>
          {!isReadOnly && (
            <IconButton
              colorPalette="blue"
              size="sm"
              onClick={handleAddRow}
              px={6}
            >
              + Add Row
            </IconButton>
          )}
        </Flex>

        <CustomTable
          columns={columns}
          data={selectedItems}
          renderRow={(item, _index) => (
            <Table.Row key={item.id}>
              <Table.Cell
                position="relative"
                minW="250px"
                style={{ zIndex: activeSuggestionId === item.id ? 999 : 1 }}
              >
                <Input
                  size="sm"
                  placeholder="Type item name..."
                  value={item.name}
                  autoComplete="off"
                  onChange={(e) => {
                    if (isReadOnly) return;
                    const val = e.target.value;
                    updateItem(item.id, {
                      name: val,
                      productId: "",
                      showSuggestions: val.length > 0,
                    });
                    setActiveSuggestionId(item.id);
                  }}
                  onFocus={() => {
                    if (isReadOnly) return;
                    if (item.name?.length > 0)
                      updateItem(item.id, { showSuggestions: true });
                    setActiveSuggestionId(item.id);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      updateItem(item.id, { showSuggestions: false });
                      setActiveSuggestionId(null);
                    }, 250);
                  }}
                  readOnly={isReadOnly}
                />
                {!item.productId && item.name.length > 2 && !isReadOnly && (
                  <HStack gap={1} mt={4}>
                    <Input
                      placeholder="Size"
                      size="sm"
                      fontSize="15px"
                      h="30px"
                      value={item.size}
                      onChange={(e) =>
                        updateItem(item.id, { size: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Unit"
                      size="sm"
                      fontSize="15px"
                      h="30px"
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(item.id, { unit: e.target.value })
                      }
                    />
                  </HStack>
                )}
                {item.showSuggestions && (
                  <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    bg="white"
                    boxShadow="xl"
                    zIndex={10000}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.300"
                  >
                    {products
                      .filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes((item.name || "").toLowerCase()),
                      )
                      .map((p) => (
                        <Box
                          key={p.id}
                          p={2}
                          cursor="pointer"
                          borderBottom="1px solid"
                          borderColor="gray.100"
                          _hover={{ bg: "blue.50" }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            updateItem(item.id, {
                              name: p.name,
                              productId: p.id,
                              hsn: p.hsn,
                              basePrice: p.buyingPrice || 0,
                              conversionRate: p.conversionRate || 1,
                              unit: p.unit || "unit",
                              showSuggestions: false,
                            });
                            setActiveSuggestionId(null);
                          }}
                        >
                          <Flex justify="space-between">
                            <Text fontSize="sm" fontWeight="bold" textTransform="uppercase" whiteSpace="normal" wordBreak="break-word">
                              {p.name}
                              {p.size ? ` (${p.size})` : ""}
                              {p.unit ? ` (${p.unit})` : ""}
                              {p.color ? ` (${p.color})` : ""}
                            </Text>
                            <Text fontSize="xs" color="blue.600">
                              Stock: {p.availableStock || 0}
                            </Text>
                          </Flex>
                        </Box>
                      ))}
                  </Box>
                )}
              </Table.Cell>
              <Table.Cell>
                <Input
                  size="sm"
                  value={item.hsn}
                  onChange={(e) => updateItem(item.id, { hsn: e.target.value })}
                  readOnly={isReadOnly}
                />
              </Table.Cell>
              <Table.Cell>
                <Input
                  type="number"
                  size="sm"
                  value={item.qty === 0 ? "" : item.qty}
                  onChange={(e) => updateItem(item.id, { qty: e.target.value })}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                  }
                  readOnly={isReadOnly}
                />
              </Table.Cell>
              <Table.Cell>
                <Input
                  type="number"
                  size="sm"
                  value={item.conversionRate || ""}
                  onChange={(e) =>
                    updateItem(item.id, { conversionRate: e.target.value })
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                  }
                  readOnly={isReadOnly}
                />
              </Table.Cell>
              <Table.Cell>
                <VStack align="start" gap={1}>
                  <Text fontWeight="bold" fontSize="sm">
                    ₹{Number(item.price).toFixed(2)}
                  </Text>
                  <HStack gap={1}>
                    <Input
                      type="number"
                      size="2xs"
                      px={1}
                      h="6"
                      placeholder="Base"
                      value={item.basePrice === 0 ? "" : item.basePrice}
                      onChange={(e) =>
                        updateItem(item.id, { basePrice: e.target.value })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                      readOnly={isReadOnly}
                    />
                    <Text fontSize="sm" color="gray.500">
                      / {item.unit || "unit"}
                    </Text>
                  </HStack>
                </VStack>
              </Table.Cell>
              <Table.Cell>
                <Input
                  type="number"
                  size="sm"
                  value={item.discPercent === 0 ? "" : item.discPercent}
                  onChange={(e) =>
                    updateItem(item.id, { discPercent: e.target.value })
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onKeyDown={(e) =>
                    ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                  }
                  readOnly={isReadOnly}
                />
              </Table.Cell>
              <Table.Cell>
                <SelectRoot
                  collection={gstRateCollection}
                  value={
                    ["5", "9", "18"].includes(
                      (
                        Number(item.cgst || 0) +
                        Number(item.sgst || 0) +
                        Number(item.igst || 0)
                      ).toString(),
                    )
                      ? [
                          (
                            Number(item.cgst || 0) +
                            Number(item.sgst || 0) +
                            Number(item.igst || 0)
                          ).toString(),
                        ]
                      : []
                  }
                  onValueChange={(e) => {
                    const r = Number(e.value[0]);
                    const tax =
                      formData.gstType === "LOCAL"
                        ? { cgst: r / 2, sgst: r / 2, igst: 0 }
                        : { igst: r, cgst: 0, sgst: 0 };
                    updateItem(item.id, tax);
                  }}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="GST%" />
                  </SelectTrigger>
                  <SelectContent portalled={false}>
                    {gstRateCollection.items.map((i) => (
                      <SelectItem item={i} key={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Table.Cell>
              {formData.gstType === "LOCAL" && (
                <>
                  <Table.Cell>
                    <Input
                      type="number"
                      size="sm"
                      value={item.cgst === 0 ? "" : item.cgst}
                      onChange={(e) =>
                        updateItem(item.id, { cgst: e.target.value })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                      readOnly={isReadOnly}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      type="number"
                      size="sm"
                      value={item.sgst === 0 ? "" : item.sgst}
                      onChange={(e) =>
                        updateItem(item.id, { sgst: e.target.value })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onKeyDown={(e) =>
                        ["e", "E", "+", "-"].includes(e.key) &&
                        e.preventDefault()
                      }
                      readOnly={isReadOnly}
                    />
                  </Table.Cell>
                </>
              )}
              {formData.gstType === "INTERSTATE" && (
                <Table.Cell>
                  <Input
                    type="number"
                    size="sm"
                    value={item.igst === 0 ? "" : item.igst}
                    onChange={(e) =>
                      updateItem(item.id, { igst: e.target.value })
                    }
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    onKeyDown={(e) =>
                      ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
                    }
                    readOnly={isReadOnly}
                  />
                </Table.Cell>
              )}
              <Table.Cell textAlign="end" fontWeight="bold">
                ₹{item.priceAfterGst?.toFixed(2)}
              </Table.Cell>
              {!isReadOnly && (
                <Table.Cell textAlign="center">
                  <IconButton
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() =>
                      setSelectedItems(
                        selectedItems.filter((it) => it.id !== item.id),
                      )
                    }
                  >
                    <MdDelete />
                  </IconButton>
                </Table.Cell>
              )}
            </Table.Row>
          )}
        />

        <Flex justify="flex-end">
          <Box
            w="300px"
            p={4}
            bg="gray.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
          >
            <VStack align="stretch" gap={1}>
              <HStack justify="space-between">
                <Text fontSize="sm">Taxable Amount</Text>
                <Text fontSize="sm">₹{totals.subtotal.toFixed(2)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Total GST</Text>
                <Text fontSize="sm">₹{totals.totalGst.toFixed(2)}</Text>
              </HStack>
              <Separator my={2} />
              <HStack justify="space-between">
                <Text fontWeight="bold">Grand Total</Text>
                <Text fontWeight="bold" fontSize="lg" color="blue.600">
                  ₹{totals.grandTotal.toFixed(2)}
                </Text>
              </HStack>
            </VStack>
          </Box>
        </Flex>
      </Stack>
    </CustomDialog>
  );
};
