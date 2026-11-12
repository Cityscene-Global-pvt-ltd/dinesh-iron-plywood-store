
import {
  Box,
  Stack,
  Text,
  Table,
  HStack,
  Input,
  VStack,
  Badge,
  Heading,
  SimpleGrid,
  Separator,
  createListCollection,
  IconButton,
} from "@chakra-ui/react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CustomModal } from "@/components/ui/CustomModal";
import { useState } from "react";
import { Sale } from "@/types/sales";
import { toast } from "@/utils/toast";
import { CustomTable } from "@/components/ui/CustomTable";
import { formatDate, getISTDateString } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import {
  useDeleteSalePaymentMutation,
  useUpdateSalePaymentMutation,
} from "@/store/apiSlice";
import { useAuth } from "@/hooks/useAuth";
import { MdDelete } from "react-icons/md";
import { CustomDeleteDialog } from "@/components/ui/CustomDeleteDialog";
import { useDeleteReturnMutation } from "@/store/apiSlice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bill: Sale;
  mode: "view" | "edit";
  returns?: any[];
}

export const BillingModal = ({
  isOpen,
  onClose,
  bill,
  mode: initialMode = "view",
  returns,
}: Props) => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [updateSalePayment, { isLoading: isUpdating }] =
    useUpdateSalePaymentMutation();
  const [deleteSalePayment, { isLoading: isDeletingPayment }] =
    useDeleteSalePaymentMutation();
  const [deleteReturnMutation, { isLoading: isDeletingReturn }] =
    useDeleteReturnMutation();

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    mode: "CASH",
    ref: "",
    date: getISTDateString(new Date()),
  });
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteReturnTargetId, setDeleteReturnTargetId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState(initialMode);

  const isReadOnly = currentMode === "view";

  const paymentMethods = createListCollection({
    items: [
      { label: "Cash", value: "CASH" },
      { label: "UPI", value: "UPI" },
      { label: "Bank Transfer", value: "BANK_TRANSFER" },
      { label: "Cheque", value: "CHEQUE" },
    ],
  });

  if (!bill) return null;

  const handleNewPaymentChange = (value: string) => {
    const numericValue = parseFloat(value) || 0;
    if (numericValue < 0) return;

    if (numericValue > Number(bill.balance)) {
      toast.warning("Payment cannot exceed outstanding balance");
      return;
    }

    setNewPayment({ ...newPayment, amount: value });
  };

  const handlePaymentSave = async () => {
    if (!newPayment.amount || Number(newPayment.amount) <= 0) {
      toast.error("Invalid Amount");
      return;
    }

    if (Number(newPayment.amount) > Number(bill?.balance)) {
      toast.error("Amount balance se zyada hai");
      return;
    }

    if (newPayment.mode !== "CASH" && !newPayment.ref.trim()) {
      toast.error("Reference Number required hai");
      return;
    }

    try {
      await updateSalePayment({
        id: bill.id,
        amount: Number(newPayment.amount),
        paymentMode: newPayment.mode,
        referenceNumber: newPayment.ref,
        paymentDate: newPayment.date,
      }).unwrap();

      toast.success("Payment Added");
      setShowPaymentForm(false);
      setNewPayment({
        amount: "",
        mode: "CASH",
        ref: "",
        date: getISTDateString(new Date()),
      });
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Payment Failed");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteSalePayment(deleteTargetId).unwrap();
      toast.success("Payment deleted");
      setDeleteTargetId(null);
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete payment");
    }
  };

  const confirmDeleteReturn = async () => {
    if (!deleteReturnTargetId) return;
    try {
      await deleteReturnMutation(deleteReturnTargetId).unwrap();
      toast.success("Return deleted successfully");
      setDeleteReturnTargetId(null);
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete return");
    }
  };

  const totalReturned = (returns || []).reduce(
    (acc, r) => acc + (Number(r.totalAmount) || 0),
    0,
  );

  const canDeletePayment =
    !isReadOnly && (isSuperAdmin || isAdmin) && totalReturned === 0;

  return (
    <CustomModal
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      title="Billing Details"
      mode={currentMode}
      onEditClick={() => setCurrentMode("edit")}
    >
      <Stack gap={6}>
        <Box
          p={4}
          bg="bg.muted"
          borderRadius="xl"
          border="1px solid"
          borderColor="brand.100"
        >
          <VStack align="stretch" gap={4}>
            <SimpleGrid columns={2} gap={10}>
              <VStack align="start" gap={2}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="brand.600"
                  borderBottom="1px solid"
                  borderColor="brand.200"
                  w="full"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Billing Details
                </Text>
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="bold">
                    {bill.customerName || "N/A"}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {bill.customerMobile || "N/A"}
                  </Text>

                  <Text fontSize="xs" color="gray.600">
                    {bill.customerEmail || "N/A"}
                  </Text>

                  <Text fontSize="xs" color="gray.600">
                    {bill.customerAddress || "No billing address provided"}
                  </Text>

                  <Badge
                    mt={1}
                    colorPalette="blue"
                    variant="subtle"
                    fontSize="2xs"
                    textTransform="uppercase"
                  >
                    GST: {bill.gstNumber || "N/A"}
                  </Badge>
                </VStack>
              </VStack>

              <VStack align="start" gap={2}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="brand.600"
                  borderBottom="1px solid"
                  borderColor="brand.200"
                  w="full"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Shipping Details
                </Text>
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="bold">
                    {bill.shippingName || "N/A"}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {bill.shippingMobile || "N/A"}
                  </Text>

                  <Text fontSize="xs" color="gray.600">
                    {bill.shippingEmail || "N/A"}
                  </Text>

                  <Text fontSize="xs" color="gray.600">
                    {bill.shippingAddress || "No shipping address provided"}
                  </Text>

                  <Badge
                    mt={1}
                    colorPalette="green"
                    variant="subtle"
                    fontSize="2xs"
                    textTransform="uppercase"
                  >
                    Ship GST: {bill.shippingGst || "N/A"}
                  </Badge>
                </VStack>
              </VStack>
            </SimpleGrid>

            <Separator borderColor="brand.100" />

            <SimpleGrid columns={2} gap={4}>
              <VStack align="start" gap={0}>
                <Text fontSize="2xs" color="gray.500" fontWeight="bold">
                  SALE DATE
                </Text>
                <Text fontSize="sm" fontWeight="bold">
                  {formatDate(bill.saleDate)}
                </Text>
              </VStack>

              <VStack align="start" gap={0}>
                <Text fontSize="2xs" color="gray.500" fontWeight="bold">
                  INVOICE NUMBER
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="brand.600">
                  #{bill.invoiceNumber}
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Box>

        <Box>
          <Text fontWeight="bold" mb={2} color="brand.900">
            Items
          </Text>
          <CustomTable
            columns={[
              { label: "Product", align: "start" },
              { label: "Qty", align: "center" },
              { label: "Rate (After Disc)", align: "end" },
              { label: "Disc(%)", align: "center" },
              { label: "GST", align: "end" },
              { label: "Total", align: "end" },
            ]}
            data={bill.items}
            maxRows={5}
            renderRow={(item: any, idx: number) => (
              <Table.Row key={idx} _hover={{ bg: "brand.50/50" }}>
                <Table.Cell py={3}>
                  {item.name}
                  <Text fontSize="xs" color="gray.500">
                    HSN: {item.hsn}
                  </Text>
                </Table.Cell>
                <Table.Cell textAlign="center">
                  {item.qty} {item.selectedUnit || item.unit || ""}
                </Table.Cell>
                <Table.Cell textAlign="end">
                  <VStack align="end">
                    <Text fontWeight="bold">
                      ₹{Number(item.price).toFixed(2)}
                    </Text>
                    <Text fontSize="2xs" color="gray.500">
                      ₹{Number(item.basePrice).toFixed(2)} /{" "}
                      {item.selectedUnit || item.unit || "unit"}
                    </Text>
                  </VStack>
                </Table.Cell>
                <Table.Cell textAlign="center">
                  {Number(item.itemDiscPercent || 0)}
                </Table.Cell>
                <Table.Cell textAlign="end">
                  ₹{Number(item.gstAmount || 0).toFixed(2)}
                </Table.Cell>
                <Table.Cell textAlign="end" fontWeight="bold" color="brand.700">
                  ₹{Number(item.priceAfterGst || 0).toFixed(2)}
                </Table.Cell>
              </Table.Row>
            )}
          />
        </Box>
        {returns && returns.length > 0 && (
          <Box mt={6}>
            <Text
              fontSize="xs"
              fontWeight="bold"
              color="orange.600"
              mb={3}
              px={4}
              letterSpacing="wider"
            >
              RETURN HISTORY ({returns.length})
            </Text>

            {returns.map((r: any) => (
              <Box
                key={r.id}
                mx={4}
                mb={4}
                p={4}
                bg="orange.50"
                border="1px solid"
                borderColor="orange.200"
                borderRadius="lg"
              >
                <VStack align="stretch" gap={3}>
                  <HStack justify="space-between">
                    <HStack gap={2}>
                      <Badge colorPalette="orange" variant="solid" size="sm">
                        RETURNED
                      </Badge>
                      <Text fontSize="sm" fontWeight="bold" color="orange.800">
                        # {r.returnNo || r.returnNumber}
                      </Text>
                    </HStack>
                    <HStack gap={2}>
                      <Text fontSize="xs" color="orange.600" fontWeight="medium">
                        {formatDate(r.returnDate)}
                      </Text>
                      {(isSuperAdmin || isAdmin) && (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => setDeleteReturnTargetId(r.id)}
                        >
                          <MdDelete />
                        </IconButton>
                      )}
                    </HStack>
                  </HStack>

                  <Box
                    borderRadius="md"
                    border="1px solid"
                    borderColor="orange.100"
                    bg="white"
                    overflow="hidden"
                  >
                    <Table.Root size="sm">
                      <Table.Header bg="orange.100/50">
                        <Table.Row>
                          <Table.ColumnHeader
                            fontSize="2xs"
                            color="orange.800"
                            py={1}
                          >
                            ITEM
                          </Table.ColumnHeader>
                          <Table.ColumnHeader
                            fontSize="2xs"
                            color="orange.800"
                            textAlign="end"
                            py={1}
                          >
                            QTY
                          </Table.ColumnHeader>
                          <Table.ColumnHeader
                            fontSize="2xs"
                            color="orange.800"
                            textAlign="end"
                            py={1}
                          >
                            REFUND
                          </Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {r.items?.map((item: any, idx: number) => (
                          <Table.Row
                            key={idx}
                            borderBottom="1px solid"
                            borderColor="orange.50"
                          >
                            <Table.Cell
                              fontSize="2xs"
                              fontWeight="bold"
                              color="gray.700"
                            >
                              {item.itemName || item.name}
                            </Table.Cell>
                            <Table.Cell fontSize="2xs" textAlign="end">
                              {item.returnQty} {item.selectedUnit || item.unit || ""}
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

                  <HStack justify="space-between" pt={1}>
                    <Text fontSize="xs" color="orange.700" fontWeight="bold">
                      CREDIT TOTAL:
                    </Text>
                    <Text fontSize="md" fontWeight="black" color="orange.600">
                      ₹{Number(r.totalAmount || 0).toFixed(2)}
                    </Text>
                  </HStack>

                  {r.remarks && (
                    <Text fontSize="2xs" fontStyle="italic" color="orange.500">
                      * {r.remarks}
                    </Text>
                  )}
                </VStack>
              </Box>
            ))}
          </Box>
        )}

        <Box
          p={4}
          bg="brand.solid/5"
          borderRadius="xl"
          border="1px solid"
          borderColor="brand.solid/20"
        >
          <VStack align="stretch" gap={4}>
            <Heading size="xs" color="brand.solid" textTransform="uppercase">
              Settlement Details
            </Heading>

            {bill?.payments && bill.payments.length > 0 && (
              <VStack align="stretch" gap={2} mb={4}>
                <Text fontSize="2xs" fontWeight="bold" color="gray.500">
                  TRANSACTION HISTORY
                </Text>
                {bill.payments.map((p: any, idx: number) => (
                  <HStack
                    key={idx}
                    justify="space-between"
                    p={2}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <VStack align="start" gap={0}>
                      <Text fontSize="xs" fontWeight="bold">
                        {formatDate(p.paymentDate)}
                      </Text>
                      <Text fontSize="2xs" color="gray.500">
                        {p.paymentMode} - {p.referenceNumber}
                      </Text>
                    </VStack>
                    <HStack gap={3}>
                      <Text fontSize="sm" fontWeight="bold" color="green.700">
                        ₹{Number(p.amount).toFixed(2)}
                      </Text>
                      {canDeletePayment && (
                        <IconButton
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          loading={isDeletingPayment}
                          onClick={() => setDeleteTargetId(p.id)}
                        >
                          <MdDelete />
                        </IconButton>
                      )}
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            )}

            <SimpleGrid columns={2} gap={4}>
              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1.5}>
                  ADDITIONAL DISCOUNT (₹)
                </Text>
                <Input
                  name="discount"
                  type="number"
                  bg="white"
                  value={Number(bill?.discount)}
                  readOnly={true}
                />
              </Box>
              <Box>
                <Text fontSize="xs" fontWeight="bold" mb={1.5}>
                  FREIGHT CHARGES (₹)
                </Text>
                <Input
                  name="freightCharges"
                  type="number"
                  bg="white"
                  value={Number(bill?.freightCharges)}
                  readOnly={true}
                />
              </Box>
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  mb={1.5}
                  color="green.700"
                >
                  AMOUNT PAID (₹)
                </Text>
                <Input
                  name="amountPaid"
                  type="number"
                  bg="white"
                  fontWeight="extrabold"
                  color="green.700"
                  value={Number(bill?.amountPaid)}
                  readOnly={true}
                />
              </Box>
            </SimpleGrid>
          </VStack>
          {!isReadOnly && Number(bill?.balance) > 0 && (
            <Box pt={2} mb={4}>
              {!showPaymentForm ? (
                <Button
                  width="full"
                  size="sm"
                  color="brand.600"
                  variant="surface"
                  onClick={() => setShowPaymentForm(true)}
                >
                  + Add Payment Entry
                </Button>
              ) : (
                <Box
                  p={4}
                  bg="white"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="blue.200"
                  shadow="sm"
                >
                  <SimpleGrid columns={2} gap={4} mb={4}>
                    <Box>
                      <Text fontSize="2xs" fontWeight="bold" mb={1}>
                        DATE
                      </Text>
                      <Input
                        size="sm"
                        type="date"
                        value={newPayment.date}
                        onChange={(e) =>
                          setNewPayment({ ...newPayment, date: e.target.value })
                        }
                      />
                    </Box>
                    <Box>
                      <Text fontSize="2xs" fontWeight="bold" mb={1}>
                        AMOUNT
                      </Text>
                      <Input
                        size="sm"
                        type="number"
                        value={
                          Number(newPayment.amount) === 0
                            ? ""
                            : newPayment.amount
                        }
                        onChange={(e) => handleNewPaymentChange(e.target.value)}
                        min={0}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onKeyDown={(e) =>
                          ["e", "E", "+", "-"].includes(e.key) &&
                          e.preventDefault()
                        }
                      />
                    </Box>
                    <Box>
                      <Text fontSize="2xs" fontWeight="bold" mb={1}>
                        MODE
                      </Text>
                      <SelectRoot
                        size="sm"
                        collection={paymentMethods}
                        value={[newPayment.mode]}
                        onValueChange={(e) => {
                          if (e.value[0]) {
                            setNewPayment({ ...newPayment, mode: e.value[0] });
                          }
                        }}
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
                    </Box>
                    <Box>
                      <Text fontSize="2xs" fontWeight="bold" mb={1}>
                        REF NO.
                      </Text>
                      <Input
                        size="sm"
                        placeholder="UTR / Ref No."
                        value={newPayment.ref}
                        onChange={(e) =>
                          setNewPayment({ ...newPayment, ref: e.target.value })
                        }
                      />
                    </Box>
                  </SimpleGrid>
                  <HStack justify="flex-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      color="brand"
                      loading={isUpdating}
                      onClick={handlePaymentSave}
                    >
                      Confirm Payment
                    </Button>
                  </HStack>
                </Box>
              )}
            </Box>
          )}
          <Separator borderColor="brand.solid/20" my={2} />

          <HStack
            justify="space-between"
            pt={4}
            borderTop="2px dashed"
            borderColor="gray.100"
          >
            <VStack align="start" gap={0}>
              <Text fontSize="2xs" color="gray.500" fontWeight="bold">
                NET OUTSTANDING
              </Text>
              <Text fontSize="2xl" fontWeight="black" color="gray.700">
                ₹{Math.abs(Number(bill.balance)).toFixed(2)}
              </Text>
            </VStack>

            <VStack align="end" gap={0}>
              <Text fontSize="2xs" color="gray.500" fontWeight="bold" mb={1}>
                PAYMENT STATUS
              </Text>
              <HStack gap={2}>
                {Number(bill.balance) > 0 ? (
                  <>
                    <Badge colorPalette="red" variant="solid" size="sm">
                      DUE AMOUNT
                    </Badge>
                    <Text fontSize="md" fontWeight="bold" color="red.600">
                      {Math.abs(bill.balance)}
                    </Text>
                  </>
                ) : Number(bill.balance) < 0 ? (
                  <>
                    <Badge colorPalette="blue" variant="solid" size="sm">
                      REFUND DUE
                    </Badge>
                    <Text fontSize="md" fontWeight="bold" color="blue.600">
                      {Math.abs(bill.balance)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Badge colorPalette="green" variant="solid" size="sm">
                      SETTLED
                    </Badge>
                    <Text fontSize="md" fontWeight="bold" color="green.600">
                      PAID IN FULL
                    </Text>
                  </>
                )}
              </HStack>
            </VStack>
          </HStack>
        </Box>
      </Stack>
      <CustomDeleteDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Payment"
        description="Are you sure? This amount will be added back to the outstanding balance."
        loading={isDeletingPayment}
      />
      <CustomDeleteDialog
        isOpen={!!deleteReturnTargetId}
        onClose={() => setDeleteReturnTargetId(null)}
        onConfirm={confirmDeleteReturn}
        title="Delete Return"
        description="Are you sure? This will revert the inventory additions and reinstate the debt balance to the customer. This cannot be undone."
        loading={isDeletingReturn}
      />
    </CustomModal>
  );
};
