
import {
  Box,
  HStack,
  Heading,
  Button,
  Tabs,
  Flex,
  Icon,
  Badge,
  createListCollection,
} from "@chakra-ui/react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Text } from "@chakra-ui/react";
import { useEffect, useRef, useState, useMemo } from "react";
import InventoryTable from "@/components/inventory/InventoryTable";
import { InventoryModal } from "@/components/inventory/InventoryModal";
import {
  MdAdd,
  MdInventory2,
  MdOutlineDownload,
  MdOutlineUpload,
} from "react-icons/md";
import { ModalMode, Product } from "@/types/inventory";
import {
  useGetInventoryQuery,
  useAddProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadInventoryMutation,
} from "@/store/apiSlice";
import { toast } from "@/utils/toast";
import { CustomSpinner } from "@/components/ui/CustomSpinner";
import { CustomDeleteDialog } from "@/components/ui/CustomDeleteDialog";
import SearchBar from "@/components/ui/SearchBar";
import { useAuth } from "@/hooks/useAuth";
import { handleExport } from "@/utils/export";
import {
  excelTemplate,
  transformInventoryData,
} from "@/exportConfigs/inventoryExport";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import InventorySummaryCard from "@/components/inventory/InventorySummaryCard";
import { useSearchParams } from "react-router-dom";

const Inventory = () => {
  const { isSuperAdmin } = useAuth();
  const { exportFormat } = useSystemSettings();
  const { data: allProducts = [], isLoading } = useGetInventoryQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadInventory, { isLoading: isUploading }] =
    useUploadInventoryMutation();
  const [addProduct] = useAddProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const [activeTab, setActiveTab] = useState<string>("pakka");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(
    undefined,
  );
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const viewItemId = searchParams.get("viewItem");
    const tabParam = searchParams.get("tab");

    if (viewItemId && allProducts.length > 0) {
      if (tabParam) {
        setActiveTab(tabParam);
      }
      const exists = allProducts.find((i: any) => i.id === viewItemId);

      if (exists) {
        setSelectedProduct(exists);
        setModalOpen(true);
        setModalMode("view");

        const newParams = new URLSearchParams(searchParams);
        newParams.delete("viewItem");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, allProducts, setSearchParams]);

  // Extract all unique units and alt units for filtering
  const availableUnits = useMemo(() => {
    const unitSet = new Set<string>();
    allProducts.forEach((p: Product) => {
      if (p.unit && p.unit.trim()) unitSet.add(p.unit.trim().toUpperCase());
      if (p.altUnit && p.altUnit.trim()) unitSet.add(p.altUnit.trim().toUpperCase());
    });
    return Array.from(unitSet).sort();
  }, [allProducts]);

  const unitFilterCollection = useMemo(() => {
    return createListCollection({
      items: [
        { label: "All Units", value: "ALL" },
        ...availableUnits.map((u) => ({ label: u, value: u })),
      ],
    });
  }, [availableUnits]);

  const stockFilterCollection = useMemo(() => {
    return createListCollection({
      items: [
        { label: "All Stock", value: "ALL" },
        { label: "In Stock (>0)", value: "IN_STOCK" },
        { label: "Out of Stock (0)", value: "OUT_OF_STOCK" },
        { label: "Low Stock (≤5)", value: "LOW_STOCK" },
      ],
    });
  }, []);

  const displayProducts = allProducts.filter((p: Product) => {
    const matchesTab = isSuperAdmin
      ? activeTab === "all"
        ? true
        : p.inventoryType === activeTab.toUpperCase()
      : true;
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.hsn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      p.unit?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      p.altUnit?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase()?.includes(searchQuery.toLowerCase());

    const matchesUnit =
      unitFilter === "ALL" ||
      p.unit?.toUpperCase() === unitFilter ||
      p.altUnit?.toUpperCase() === unitFilter;

    let matchesStock = true;
    const stock = Number(p.availableStock || 0);
    if (stockFilter === "IN_STOCK") {
      matchesStock = stock > 0;
    } else if (stockFilter === "OUT_OF_STOCK") {
      matchesStock = stock <= 0;
    } else if (stockFilter === "LOW_STOCK") {
      matchesStock = stock <= 5;
    }

    return matchesTab && matchesSearch && matchesUnit && matchesStock;
  });

  const handleAdd = () => {
    setSelectedProduct(undefined);
    setModalMode("add");
    setModalOpen(true);
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setModalMode("view");
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDeleteTrigger = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete.id).unwrap();
        setProductToDelete(null);
      } catch (error) {
        console.error(error);
      }
    }
  };
  const handleSubmit = async (data: Product) => {
    try {
      const payload = { ...data, inventoryType: activeTab.toUpperCase() };
      if (selectedProduct) {
        await updateProduct({ id: selectedProduct.id, ...payload }).unwrap();
        toast.success("product updated!");
      } else {
        await addProduct(payload).unwrap();
        toast.success("product added!");
      }
      setModalOpen(false);
    } catch (error: any) {
      toast.error(error.data.message || "Failed to update!");
    }
  };

  const handleExportExcel = () => {
    const data = transformInventoryData(displayProducts);
    handleExport(data, exportFormat, "Inventory List");
  };

  const handleDownloadTemplate = () => {
    handleExport(excelTemplate, "xlsx", "Inventory_Import_Template");
  };

  const handleImportClick = () => {
    fileInputRef?.current?.click();
  };

  const handleFileChange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadInventory(formData).unwrap();
      toast.success("Inventory Updated!");
      e.target.value = null;
    } catch (err) {
      toast.error("Upload Failed!");
    } finally {
      e.target.value = "";
    }
  };

  if (isLoading) return <CustomSpinner message="Fetching Products" />;

  return (
    <Box w="full" p={6} bg="bg.canvas" minH="100vh">
      <Flex
        justify="space-between"
        align="center"
        bg="white"
        p={6}
        borderRadius="xl"
        border="1px solid"
        borderColor="brand.100"
        shadow="sm"
        mb={6}
      >
        <HStack gap={4}>
          <Box p={2} bg="brand.50" borderRadius="lg" color="brand.600">
            <Icon as={MdInventory2} boxSize={6} />
          </Box>
          <Box>
            <HStack gap={2} mb={0.5}>
              <Heading
                size="lg"
                letterSpacing="tight"
                color="brand.900"
                lineHeight="short"
              >
                Inventory
              </Heading>
              <Badge
                colorPalette="brand"
                variant="subtle"
                size="sm"
                borderRadius="md"
              >
                In Stock
              </Badge>
            </HStack>
            <Text color="brand.500" fontSize="sm" fontWeight="medium">
              Track stock levels and manage product listings
            </Text>
          </Box>
        </HStack>

        <Button
          onClick={handleAdd}
          colorPalette="brand"
          size="md"
          px={6}
          fontWeight="bold"
          borderRadius="lg"
          shadow="sm"
          _hover={{ transform: "translateY(-1px)", shadow: "md" }}
        >
          <Icon as={MdAdd} mr={1} boxSize={5} /> Add New Product
        </Button>
      </Flex>

      {isSuperAdmin && <InventorySummaryCard inventory={displayProducts} />}

      <Tabs.Root
        lazyMount
        value={activeTab}
        onValueChange={(e) => setActiveTab(e.value)}
      >
        {isSuperAdmin && (
          <Tabs.List bg="bg.muted" p="1" borderRadius="lg" mb={6} width="400px">
            <Tabs.Trigger value="pakka" flex="1">
              Online Portal
            </Tabs.Trigger>
            <Tabs.Trigger value="kaccha" flex="1">
              Portal
            </Tabs.Trigger>
            <Tabs.Trigger value="all" flex="1">
              ALL
            </Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
        )}
        <HStack gap="4" width="full" mb={4} wrap="wrap">
          <Box flex="1" minW="220px">
            <SearchBar
              placeholder="Search products, units..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </Box>

          <Box minW="150px">
            <SelectRoot
              collection={unitFilterCollection}
              value={[unitFilter]}
              onValueChange={(e) => setUnitFilter(e.value[0] || "ALL")}
              size="sm"
            >
              <SelectTrigger bg="white">
                <SelectValueText placeholder="Filter by Unit" />
              </SelectTrigger>
              <SelectContent portalled={false}>
                {unitFilterCollection.items.map((i) => (
                  <SelectItem key={i.value} item={i}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Box>

          <Box minW="150px">
            <SelectRoot
              collection={stockFilterCollection}
              value={[stockFilter]}
              onValueChange={(e) => setStockFilter(e.value[0] || "ALL")}
              size="sm"
            >
              <SelectTrigger bg="white">
                <SelectValueText placeholder="Filter by Stock" />
              </SelectTrigger>
              <SelectContent portalled={false}>
                {stockFilterCollection.items.map((i) => (
                  <SelectItem key={i.value} item={i}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </SelectRoot>
          </Box>

          <HStack gap={2}>
            {isSuperAdmin && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx, .xls, .csv, .json"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  color="brand.600"
                  fontSize="sm"
                  onClick={handleDownloadTemplate}
                  _hover={{ bg: "brand.200" }}
                >
                  Download Template
                </Button>
                <Button
                  variant="outline"
                  color="brand.600"
                  onClick={handleImportClick}
                  loading={isUploading}
                  loadingText="Importing..."
                >
                  <MdOutlineUpload size="20px" />
                  Import
                </Button>
              </>
            )}
            <Button
              variant="outline"
              color="brand.600"
              onClick={handleExportExcel}
            >
              <MdOutlineDownload size="20px" />
              Export
            </Button>
          </HStack>
        </HStack>

        <Tabs.Content value="pakka">
          <InventoryTable
            products={displayProducts}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteTrigger}
            activeTab={activeTab}
          />
        </Tabs.Content>

        <Tabs.Content value="kaccha">
          <InventoryTable
            products={displayProducts}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteTrigger}
            activeTab={activeTab}
          />
        </Tabs.Content>

        <Tabs.Content value="all">
          <InventoryTable
            products={displayProducts}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDeleteTrigger}
            activeTab={activeTab}
          />
        </Tabs.Content>
      </Tabs.Root>

      <InventoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        product={selectedProduct}
        mode={modalMode}
      />

      <CustomDeleteDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        loading={isDeleting}
      />
    </Box>
  );
};

export default Inventory;
