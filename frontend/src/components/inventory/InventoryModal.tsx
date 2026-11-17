import { Input, Stack, Grid, Field, HStack, Text } from "@chakra-ui/react";
import { CustomModal } from "@/components/ui/CustomModal";
import { useState, useEffect } from "react";
import { InventoryModalProps, Product } from "@/types/inventory";
import { Button } from "../ui/button";
import { toast } from "@/utils/toast";

export const InventoryModal = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  mode: initialMode = "add",
}: InventoryModalProps) => {
  const [currentMode, setCurrentMode] = useState(initialMode);
  const [formData, setFormData] = useState<Product>({
    name: "",
    hsn: "",
    category: "",
    type: "",
    unit: "",
    altUnit: "",
    altUnitConversion: undefined,
    size: "",
    color: "",
    availableStock: 0,
    minStockThreshold: undefined,
    buyingPrice: 0,
    sellingPrice: 0,
    conversionRate: 1,
  });

  useEffect(() => {
    setCurrentMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: "",
        hsn: "",
        category: "",
        type: "",
        unit: "",
        altUnit: "",
        altUnitConversion: undefined,
        size: "",
        color: "",
        availableStock: 0,
        minStockThreshold: undefined,
        buyingPrice: 0,
        sellingPrice: 0,
        conversionRate: 1,
      });
    }
  }, [product, isOpen]);

  const handleChange = (field: keyof Product, value: any) => {
    let finalValue = value;

    if (["buyingPrice", "sellingPrice"].includes(field)) {
      if (value === "" || value === null || value === undefined) {
        finalValue = field === "buyingPrice" ? undefined : 0;
      } else {
        const num = Number(value);
        finalValue = isNaN(num) || num < 0 ? 0 : num;
      }
    } else if (field === "minStockThreshold") {
      if (value === "" || value === null || value === undefined) {
        finalValue = undefined;
      } else {
        const num = Number(value);
        finalValue = isNaN(num) || num < 0 ? undefined : num;
      }
    }

    setFormData((prev) => ({ ...prev, [field]: finalValue }));
  };

  const isViewMode = currentMode === "view";

  const validateInventoryData = (data: Product) => {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push("Product name is mandatory");
    } else if (data.name.trim().length < 3) {
      errors.push("Product name must be at least 3 characters");
    }

    // Buying price is now OPTIONAL (not mandatory). If provided, it must not be negative.
    if (data.buyingPrice !== undefined && data.buyingPrice !== null && data.buyingPrice < 0) {
      errors.push("Buying price cannot be negative");
    }

    if (!data.sellingPrice || data.sellingPrice <= 0) {
      errors.push("Selling price must be greater than 0");
    }

    // Only validate sellingPrice < buyingPrice if a buying price was actually entered (> 0)
    if (
      data.buyingPrice !== undefined &&
      data.buyingPrice !== null &&
      Number(data.buyingPrice) > 0 &&
      Number(data.sellingPrice) < Number(data.buyingPrice)
    ) {
      errors.push("Selling price cannot be less than buying price");
    }

    // Validate alt unit conversion - if alt unit is set, conversion must be > 0
    if (data.altUnit && data.altUnit.trim() !== "") {
      if (!data.altUnitConversion || data.altUnitConversion <= 0) {
        errors.push("Alt Unit Conversion must be greater than 0 when Alt Unit is set");
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  };

  return (
    <CustomModal
      title={
        isViewMode
          ? "Product Details"
          : currentMode === "edit"
            ? "Edit Product"
            : "Add New Product"
      }
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      onConfirm={() => {
        if (isViewMode) {
          onClose();
          return;
        }

        const validation = validateInventoryData(formData);

        if (!validation.isValid && validation.errors[0]) {
          toast.error(validation.errors[0]);
          return;
        }
        onSubmit(formData);
      }}
      confirmLabel={currentMode === "add" ? "Add Product" : "Update Product"}
      mode={currentMode}
      onEditClick={() => setCurrentMode("edit")}
    >
      <Stack gap={4}>
        <Grid templateColumns="2fr 1fr" gap={4}>
          <Field.Root>
            <Field.Label>Product Name *</Field.Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              readOnly={isViewMode}
              placeholder="Enter Product Name"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>HSN</Field.Label>
            <HStack gap={2}>
              <Input
                value={formData.hsn}
                onChange={(e) => handleChange("hsn", e.target.value)}
                readOnly={isViewMode}
                placeholder="HSN"
              />
              {!isViewMode && (
                <Button
                  size="sm"
                  onClick={() => {
                    const randomhsn = Math.floor(
                      100000 + Math.random() * 900000,
                    ).toString();
                    handleChange("hsn", randomhsn);
                  }}
                >
                  Generate
                </Button>
              )}
            </HStack>
          </Field.Root>
        </Grid>

        <Grid templateColumns="1fr 1fr" gap={4}>
          <Field.Root>
            <Field.Label>Category</Field.Label>
            <Input
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              readOnly={isViewMode}
              placeholder="Category"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Type</Field.Label>
            <Input
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value)}
              readOnly={isViewMode}
              placeholder="Type"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Unit</Field.Label>
            <Input
              value={formData.unit}
              onChange={(e) => handleChange("unit", e.target.value)}
              readOnly={isViewMode}
              placeholder="Unit (e.g. PCS, KG)"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Size</Field.Label>
            <Input
              value={formData.size}
              onChange={(e) => handleChange("size", e.target.value)}
              readOnly={isViewMode}
              placeholder="Size"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Alt Unit</Field.Label>
            <Input
              value={formData.altUnit || ""}
              onChange={(e) => handleChange("altUnit", e.target.value)}
              readOnly={isViewMode}
              placeholder="e.g. BOX, BUNDLE"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Alt Unit Conversion</Field.Label>
            <Input
              type="number"
              value={formData.altUnitConversion ?? ""}
              placeholder="e.g. 12 (1 BOX = 12 PCS)"
              min={0}
              onChange={(e) =>
                handleChange("altUnitConversion", Number(e.target.value) || undefined)
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              onKeyDown={(e) =>
                ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
              }
              readOnly={isViewMode}
            />
            {formData.altUnit && formData.altUnitConversion && formData.unit ? (
              <Text fontSize="xs" color="gray.500" mt={1}>
                1 {formData.altUnit.toUpperCase()} = {formData.altUnitConversion} {formData.unit.toUpperCase()}
              </Text>
            ) : null}
          </Field.Root>

          <Field.Root>
            <Field.Label>Color</Field.Label>
            <Input
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              readOnly={isViewMode}
              placeholder="Color"
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>Conversion Rate *</Field.Label>
            <Input
              type="number"
              value={formData.conversionRate ?? ""}
              placeholder="0"
              min={0}
              onChange={(e) =>
                handleChange("conversionRate", Number(e.target.value))
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              onKeyDown={(e) =>
                ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
              }
              readOnly={isViewMode}
            />
          </Field.Root>
        </Grid>

        <Grid templateColumns="1fr 1fr 1fr 1fr" gap={4}>
          <Field.Root>
            <Field.Label>Stock *</Field.Label>
            <Input
              type="number"
              value={formData.availableStock ?? ""}
              placeholder="0"
              min={0}
              onChange={(e) =>
                handleChange("availableStock", Number(e.target.value))
              }
              readOnly={isViewMode}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label>
              Low Stock Alert
            </Field.Label>
            <Input
              type="number"
              value={
                formData.minStockThreshold !== undefined && formData.minStockThreshold !== null
                  ? formData.minStockThreshold
                  : ""
              }
              placeholder="Default: 5"
              min={0}
              onChange={(e) =>
                handleChange("minStockThreshold", e.target.value)
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              onKeyDown={(e) =>
                ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
              }
              readOnly={isViewMode}
            />
            <Text fontSize="2xs" color="gray.500" mt={0.5}>
              Item-specific threshold
            </Text>
          </Field.Root>

          <Field.Root>
            <Field.Label>
              Buying Price
            </Field.Label>
            <Input
              type="number"
              value={
                formData.buyingPrice !== undefined && formData.buyingPrice !== null
                  ? formData.buyingPrice
                  : ""
              }
              placeholder="Optional"
              min={0}
              onChange={(e) =>
                handleChange("buyingPrice", e.target.value)
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              onKeyDown={(e) =>
                ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
              }
              readOnly={isViewMode}
            />
            <Text fontSize="2xs" color="gray.500" mt={0.5}>
              Optional
            </Text>
          </Field.Root>

          <Field.Root>
            <Field.Label>Selling Price *</Field.Label>
            <Input
              type="number"
              value={formData.sellingPrice ?? ""}
              placeholder="0"
              min={0}
              onChange={(e) =>
                handleChange("sellingPrice", Number(e.target.value))
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              onKeyDown={(e) =>
                ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()
              }
              readOnly={isViewMode}
            />
          </Field.Root>
        </Grid>
      </Stack>
    </CustomModal>
  );
};
