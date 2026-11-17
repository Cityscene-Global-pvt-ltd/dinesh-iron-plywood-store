import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Stack,
  Flex,
  Text,
  Tabs,
  HStack,
  Center,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { Button } from "@/components/ui/button";
import { MdAdd, MdLocalShipping, MdOutlineDownload } from "react-icons/md";
import { SupplierTable } from "@/components/suppliers/SupplierTable";
import { SupplierModal } from "@/components/suppliers/modal/SupplierModal";
import { SupplierHistoryModal } from "@/components/suppliers/modal/SupplierHistoryModal";
import { AddNewOrder } from "@/components/suppliers/modal/AddNewOrder";
import { Supplier } from "@/types/supplier";
import {
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useUpdateSupplierMutation,
  useAddSupplierOrderMutation,
  useDeleteSupplierMutation,
  useGetInventoryQuery,
  useGetCompanyQuery,
  useUpdateSupplierOrderMutation,
  useDeleteSupplierOrderMutation,
  useReceivePurchaseOrderMutation,
  useGetDummyCompanyQuery,
  useGetVouchersQuery,
} from "@/store/apiSlice";
import { toast } from "@/utils/toast";
import PayableSummaryCards from "@/components/suppliers/PayableSummaryCards";
import SearchBar from "@/components/ui/SearchBar";
import { CustomDeleteDialog } from "@/components/ui/CustomDeleteDialog";
import { CustomSpinner } from "@/components/ui/CustomSpinner";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { transformSupplierData } from "@/exportConfigs/supplierExport";
import { handleExport } from "@/utils/export";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { ReceivePurchaseOrder } from "@/components/suppliers/modal/ReceivePurchaseOrder";
import { generateSupplierPDF } from "@/utils/pdfGenerator";

export const SupplierPage = () => {
  const { isSuperAdmin } = useAuth();
  const { exportFormat } = useSystemSettings();
  const { data: suppliers = [], isLoading } = useGetSuppliersQuery();
  const { data: products = [] } = useGetInventoryQuery();
  const { data: companyData = [] } = useGetCompanyQuery();
  const { data: dummyCompanyData = [] } = useGetDummyCompanyQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const { data: vouchers = [] } = useGetVouchersQuery();
  const [addSupplier] = useAddSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [addSupplierOrder] = useAddSupplierOrderMutation();
  const [updateSupplierOrder] = useUpdateSupplierOrderMutation();
  const [deleteSupplier, { isLoading: isDeleting }] =
    useDeleteSupplierMutation();
  const [deleteSupplierOrder] = useDeleteSupplierOrderMutation();
  const [receiveOrder, { isLoading: isReceiving }] =
    useReceivePurchaseOrderMutation();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "add">("view");
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"supplier" | "history" | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<string>("pakka");
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any | null>(null);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);

  useEffect(() => {
    const openHistoryId = searchParams.get("openHistory");
    const billId = searchParams.get("billId");
    const tabParam = searchParams.get("tab");

    if (openHistoryId && suppliers.length > 0) {
      const targetSupplier = suppliers.find((s: any) => s.id === openHistoryId);

      if (tabParam) {
        setActiveTab(tabParam);
      }

      if (targetSupplier) {
        setSelectedSupplierId(targetSupplier.id);
        
        if (billId) {
          const allBills = targetSupplier.bills || targetSupplier.orders || [];
          const billToOpen = allBills.find((b: any) => b.id === billId);

          if (billToOpen) {
            setSelectedBill(billToOpen);
            setSelectedOrderId(billToOpen.poId);
            setModalMode("view");
            setIsBillOpen(true);
          } else {
            setActiveModal("history");
          }
        } else {
          setActiveModal("history");
        }
      }
    }

    if (openHistoryId || billId) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("openHistory");
      newParams.delete("billId");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, suppliers, setSearchParams]);

  const displaySuppliers = suppliers
    .map((s: any) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobile?.includes(searchQuery);

      if (!matchesSearch) return null;

      const filteredOrders = (s.orders || []).filter(
        (o: any) => o.orderType === activeTab.toUpperCase(),
      );

      const activeOrderIds = filteredOrders.map((o: any) => o.id);

      const filteredBills = (s.bills || []).filter((b: any) =>
        activeOrderIds.includes(b.poId),
      );

      return {
        ...s,
        orders: filteredOrders,
        bills: filteredBills,
      };
    })
    .filter(Boolean);

  const filteredProducts = products.filter(
    (p: any) => p.inventoryType === activeTab.toUpperCase(),
  );

  const selectedSupplier =
    displaySuppliers.find((s: any) => s.id === selectedSupplierId) || null;

  const activeOrder =
    displaySuppliers
      ?.flatMap((s: any) => s.orders || [])
      .find((o: any) => o.id === selectedOrderId) || null;

  const supplierVouchers = vouchers.filter(
    (v: any) =>
      v.relatedEntityType === "SUPPLIER" &&
      v.relatedEntityId === selectedSupplierId &&
      v.status === "APPROVED"
  );

  const activeCompanyData = isSuperAdmin
    ? activeTab === "pakka"
      ? companyData
      : dummyCompanyData
    : companyData;

  const handleSupplierAction = (
    mode: "view" | "edit" | "add",
    s?: Supplier,
  ) => {
    setModalMode(mode);
    setSelectedSupplierId(s?.id || null);
    setActiveModal("supplier");
  };

  const handleModalSubmit = async (formData: Supplier) => {
    try {
      if (modalMode === "add") {
        await addSupplier({
          ...formData,
        }).unwrap();
        toast.success("Supplier added!");
      } else {
        const { id, ...updateData } = formData;
        await updateSupplier({ id, ...updateData }).unwrap();
        toast.success("Supplier updated!");
      }
      setActiveModal(null);
    } catch (error) {
      toast.error("Failed to update!");
    }
  };

  const handleHistoryAction = (s: Supplier) => {
    setSelectedSupplierId(s?.id || null);
    setActiveModal("history");
  };

  const handleOrderAction = (mode: "view" | "edit" | "bill", o?: any) => {
    setSelectedOrderId(o?.id || null);
    setModalMode(mode as any);

    if (mode === "bill") {
      setIsBillOpen(true);
    } else {
      setIsOrderOpen(true);
    }
  };

  const handleViewBill = (mode: "view", bill?: any) => {
    setSelectedBill(bill);
    setIsBillOpen(true);
    setModalMode(mode);
    setSelectedOrderId(bill?.poId);
  };

  const handleAddNewOrder = async (orderData: any) => {
    if (!selectedSupplier) return;

    if (!orderData.orderNumber) return toast.error("PO Number is required");
    if (!orderData.items || orderData.items.length === 0)
      return toast.error("Add at least one item");

    const payload = {
      supplierId: selectedSupplier.id,
      orderNumber: orderData.orderNumber,
      orderDate: orderData.orderDate,
      orderType: activeTab.toUpperCase(),
      transportName: orderData.transportName || null,
      transportContact: orderData.transportContact || null,
      lrNumber: orderData.lrNumber || null,
      transportMode: orderData.transportMode || "ROAD",
      expectedDeliveryDate: orderData.expectedDeliveryDate || null,
      freightAmount: Number(orderData.freightAmount || 0),
      transportNotes: orderData.transportNotes || null,
      billingName: orderData.billingName,
      billingEmail: orderData.billingEmail,
      billingMobile: orderData.billingMobile,
      billingGst: orderData.billingGst,
      billingAddress: orderData.billingAddress,
      shippingName: orderData.shippingName,
      shippingEmail: orderData.shippingEmail,
      shippingMobile: orderData.shippingMobile,
      shippingGst: orderData.shippingGst,
      shippingAddress: orderData.shippingAddress,
      gstType: orderData.gstType,
      subtotal: orderData.subtotal,
      totalGstAmount: orderData.totalGstAmount,
      totalAmount: orderData.totalAmount,
      items: orderData.items,
    };

    try {
      if (orderData.id) {
        await updateSupplierOrder({
          orderId: orderData.id,
          ...payload,
        }).unwrap();
        toast.success("Purchase Order updated successfully");
      } else {
        await addSupplierOrder(payload).unwrap();
        toast.success("Purchase Order created successfully");
      }
      setIsOrderOpen(false);
      setIsBillOpen(false);
    } catch (error) {
      toast.error("Failed to save Purchase Order");
    }
  };

  const handleOrderDeleteRequest = (o: any) => {
    setOrderToDelete(o);
  };

  const handleOrderDelete = async () => {
    try {
      await deleteSupplierOrder({ orderId: orderToDelete.id }).unwrap();
      toast.success("Deleted successfully");
      setOrderToDelete(null);
    } catch (error: any) {
      toast.error(error?.data?.message || "Delete failed");
    }
  };

  const handleReceiveSubmit = async (payload: any) => {
    try {
      await receiveOrder(payload).unwrap();
      toast.success("Purchase bill generated and stock updated!");
      setIsBillOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to receive order");
    }
  };

  const handleDeleteRequest = (s: Supplier) => {
    setSupplierToDelete(s);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete?.id) return;
    try {
      await deleteSupplier({ id: supplierToDelete.id }).unwrap();
      toast.success("Supplier and all history deleted!");
      setSupplierToDelete(null);
    } catch (error) {
      toast.error("Failed to delete supplier");
    }
  };

  const handleExportExcel = () => {
    const data = transformSupplierData(displaySuppliers);
    handleExport(data, exportFormat, "Suppliers List");
  };

  const handleDownloadPO = (o: any) => {
    generateSupplierPDF(o, selectedSupplier, "PO");
  };

  return (
    <Box p={8}>
      <Stack gap={6}>
        <Flex
          justify="space-between"
          align="center"
          bg="white"
          p={6}
          borderRadius="xl"
          border="1px solid"
          borderColor="brand.100"
          shadow="sm"
        >
          <HStack gap={4}>
            <Box p={2} bg="brand.50" borderRadius="lg" color="brand.600">
              <Icon as={MdLocalShipping} boxSize={6} />
            </Box>
            <Box>
              <HStack gap={2} mb={0.5}>
                <Heading
                  size="lg"
                  letterSpacing="tight"
                  color="brand.900"
                  lineHeight="short"
                >
                  Suppliers
                </Heading>
                <Badge
                  colorPalette="brand"
                  variant="subtle"
                  size="sm"
                  borderRadius="md"
                >
                  Partners
                </Badge>
              </HStack>
              <Text color="brand.500" fontSize="sm" fontWeight="medium">
                Manage your supply chain and orders
              </Text>
            </Box>
          </HStack>

          <Button
            onClick={() => handleSupplierAction("add")}
            colorPalette="brand"
            size="md"
            px={6}
            fontWeight="bold"
            borderRadius="lg"
            shadow="sm"
            _hover={{ transform: "translateY(-1px)", shadow: "md" }}
          >
            <Icon as={MdAdd} mr={1} boxSize={5} /> Add Supplier
          </Button>
        </Flex>

        <PayableSummaryCards suppliers={displaySuppliers} vouchers={vouchers} />

        <Tabs.Root
          defaultValue="pakka"
          onValueChange={(e) => setActiveTab(e.value)}
        >
          {isSuperAdmin && (
            <Tabs.List
              bg="bg.muted"
              p={1}
              borderRadius="lg"
              width="300px"
              mb={6}
            >
              <Tabs.Trigger
                value="pakka"
                flex={1}
                borderRadius="md"
                fontWeight="bold"
              >
                Online Portal
              </Tabs.Trigger>
              <Tabs.Trigger
                value="kaccha"
                flex={1}
                borderRadius="md"
                fontWeight="bold"
              >
                Portal
              </Tabs.Trigger>
              <Tabs.Indicator />
            </Tabs.List>
          )}

          <HStack gap="4" width="full">
            <Box flex="1">
              <SearchBar
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </Box>

            <Button
              variant="outline"
              color="brand.500"
              onClick={handleExportExcel}
            >
              <MdOutlineDownload size="20px" /> Export
            </Button>
          </HStack>

          <Tabs.Content value={activeTab}>
            {isLoading ? (
              <Center p={10}>
                <CustomSpinner message="Fetching suppliers..." />
              </Center>
            ) : (
              <SupplierTable
                suppliers={displaySuppliers}
                onView={(s) => handleSupplierAction("view", s)}
                onEdit={(s) => handleSupplierAction("edit", s)}
                onHistory={handleHistoryAction}
                onDelete={handleDeleteRequest}
              />
            )}
          </Tabs.Content>
        </Tabs.Root>
      </Stack>

      <SupplierModal
        isOpen={activeModal === "supplier"}
        onClose={() => setActiveModal(null)}
        supplier={selectedSupplier}
        mode={modalMode}
        onSubmit={handleModalSubmit}
      />

      <SupplierHistoryModal
        isOpen={activeModal === "history"}
        onClose={() => setActiveModal(null)}
        supplier={selectedSupplier}
        supplierVouchers={supplierVouchers}
        onOrderAction={(mode, order) => handleOrderAction(mode, order)}
        onAddNewOrder={() => {
          setSelectedOrderId(null);
          setIsOrderOpen(true);
          setModalMode("add");
        }}
        onOrderDelete={handleOrderDeleteRequest}
        onViewBill={handleViewBill}
        onDownloadPO={handleDownloadPO}
      />

      <AddNewOrder
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        onSubmit={handleAddNewOrder}
        supplier={selectedSupplier}
        products={filteredProducts}
        myCompanyDetails={activeCompanyData}
        mode={modalMode}
        orderData={activeOrder}
      />
      <ReceivePurchaseOrder
        isOpen={isBillOpen}
        onClose={() => {
          setIsBillOpen(false);
          setSelectedBill(null);
        }}
        supplier={selectedSupplier}
        orderData={activeOrder}
        onSubmit={handleReceiveSubmit}
        isLoading={isReceiving}
        bill={selectedBill}
        mode={modalMode}
      />

      <CustomDeleteDialog
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title="Delete Supplier?"
        description={`Are you sure you want to delete "${supplierToDelete?.name}"? This action will permanently remove all related orders and payments.`}
      />

      <CustomDeleteDialog
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleOrderDelete}
        loading={isDeleting}
        title="Delete Order?"
        description={`Are you sure you want to delete "${orderToDelete?.orderNumber}"? This action can't be undone`}
      />
    </Box>
  );
};
