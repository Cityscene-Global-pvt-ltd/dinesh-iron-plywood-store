import { Box, HStack, Table, IconButton, Text, Stack } from "@chakra-ui/react";
import { CustomTable } from "../ui/CustomTable";
import { MdVisibility, MdEdit, MdDelete } from "react-icons/md";
import { InventoryTableProps } from "@/types/inventory";
import { useAuth } from "@/hooks/useAuth";

const InventoryTable = ({
  products,
  onView,
  onEdit,
  onDelete,
  activeTab,
}: InventoryTableProps) => {
  const { isSuperAdmin, isAdmin, user } = useAuth();
  const columns = [
    { label: "S.No", align: "start" as const },
    { label: "Name", align: "start" as const },
    ...(isSuperAdmin && activeTab === "all"
      ? [{ label: "Type", align: "start" as const }]
      : []),
    { label: "HSN", align: "start" as const },
    { label: "Stock", align: "start" as const },
    { label: "Price", align: "start" as const },
    { label: "Action", align: "center" as const },
  ];

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="xl"
      border="1px solid"
      borderColor="brand.200"
    >
      <CustomTable
        columns={columns}
        data={products}
        renderRow={(product, index) => (
          <Table.Row key={product.id || index} _hover={{ bg: "brand.50" }}>
            <Table.Cell py={4} px={4}>
              {index + 1}
            </Table.Cell>
            <Table.Cell
              py={4}
              px={4}
              fontWeight="bold"
              textTransform="uppercase"
            >
              {product.name}
              {product.size ? ` (${product.size})` : ""}{" "}
              {product.unit ? `(${product.unit})` : ""}
              {product.altUnit ? ` / ${product.altUnit}` : ""}
              {product.color ? ` (${product.color})` : ""}
            </Table.Cell>
            {isSuperAdmin && activeTab === "all" && (
              <Table.Cell py={4} fontWeight="bold">
                {product.inventoryType}
              </Table.Cell>
            )}
            <Table.Cell py={4} px={4}>
              {product.hsn}
            </Table.Cell>
            <Table.Cell py={4} px={4} fontWeight="extrabold">
              <Stack gap={0}>
                <Text>{product.availableStock} {product.unit || ""}</Text>
                {product.altUnit && product.altUnitConversion && product.altUnitConversion > 0 ? (
                  <Text fontSize="xs" color="gray.500">
                    ≈ {(product.availableStock / product.altUnitConversion).toFixed(2)} {product.altUnit}
                  </Text>
                ) : null}
              </Stack>
            </Table.Cell>
            <Table.Cell py={4} px={4}>
              <Stack gap={0}>
                {Number(product.conversionRate) > 1 ? (
                  <>
                    <Text fontWeight="bold">
                      ₹
                      {Number(product.sellingPrice) *
                        Number(product.conversionRate)}{" "}
                      / item
                    </Text>
                    <Text fontSize="xs" color="gray.600">
                      ₹{product.sellingPrice} / {product?.unit || "unit"}
                    </Text>
                  </>
                ) : (
                  <Text>
                    ₹{product.sellingPrice} / {product?.unit || "unit"}
                  </Text>
                )}
                {product.altUnit && product.altUnitConversion && product.altUnitConversion > 0 ? (
                  <Text fontSize="xs" color="blue.600" fontWeight="medium">
                    ₹{(Number(product.sellingPrice) * Number(product.altUnitConversion) * Number(product.conversionRate || 1)).toFixed(2)} / {product.altUnit}
                  </Text>
                ) : null}
              </Stack>
            </Table.Cell>
            <Table.Cell py={4} px={4}>
              <HStack gap={1} justify="center">
                <IconButton
                  variant="ghost"
                  size="sm"
                  colorPalette="brand"
                  onClick={() => onView(product)}
                >
                  <MdVisibility />
                </IconButton>
                {(isSuperAdmin ||
                  isAdmin ||
                  user?.role === "INVENTORY_MANAGER") && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    colorPalette="blue"
                    onClick={() => onEdit(product)}
                  >
                    <MdEdit />
                  </IconButton>
                )}
                {(isSuperAdmin || isAdmin) && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    colorPalette="red"
                    onClick={() => onDelete(product)}
                  >
                    <MdDelete />
                  </IconButton>
                )}
              </HStack>
            </Table.Cell>
          </Table.Row>
        )}
      />
    </Box>
  );
};

export default InventoryTable;
