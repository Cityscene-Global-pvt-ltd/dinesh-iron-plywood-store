import { Box, HStack, Table, IconButton, Badge } from "@chakra-ui/react";
import { CustomTable } from "../ui/CustomTable";
import {
  MdVisibility,
  MdEdit,
  MdDelete,
  MdCardGiftcard,
  MdHistory,
} from "react-icons/md";
import { ReferenceTableProps } from "@/types/references";
import { CustomSpinner } from "../ui/CustomSpinner";
import { useAuth } from "@/hooks/useAuth";

export const ReferenceTable = ({
  references,
  onView,
  onEdit,
  onDelete,
  onRedeem,
  onHistory,
  isLoading,
}: ReferenceTableProps) => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const columns = [
    { label: "Ref No.", align: "start" as const },
    { label: "Name", align: "start" as const },
    { label: "Mobile", align: "start" as const },
    { label: "Total Points", align: "start" as const },
    { label: "Redeemed", align: "start" as const },
    { label: "Available", align: "start" as const },
    { label: "Action", align: "center" as const },
  ];

  if (isLoading) return <CustomSpinner message="Fetching References" />;

  return (
    <Box
      bg="bg.panel"
      p={6}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="brand.200"
    >
      <CustomTable
        columns={columns}
        data={references}
        renderRow={(ref, index) => {
          const totalPoints = Number(ref.points || 0);
          const redeemed = Number(ref.redeemedPoints || 0);
          const available = Math.max(0, totalPoints - redeemed);

          return (
            <Table.Row key={ref.id || index} _hover={{ bg: "brand.50" }}>
              <Table.Cell py={4} px={4} fontWeight="medium" fontSize="xs">
                {ref.referenceNumber || "N/A"}
              </Table.Cell>
              <Table.Cell py={4} px={4} fontWeight="bold">
                {ref.name}
              </Table.Cell>
              <Table.Cell py={4} px={4}>
                {ref.mobile}
              </Table.Cell>
              <Table.Cell py={4} px={4} fontWeight="semibold" color="blue.600">
                {totalPoints}
              </Table.Cell>
              <Table.Cell py={4} px={4} fontWeight="medium" color="orange.600">
                {redeemed}
              </Table.Cell>
              <Table.Cell py={4} px={4}>
                <Badge
                  colorPalette={available > 0 ? "green" : "gray"}
                  variant={available > 0 ? "solid" : "subtle"}
                  size="sm"
                  borderRadius="md"
                >
                  {available} pts
                </Badge>
              </Table.Cell>
              <Table.Cell py={4} px={4}>
                <HStack gap={1} justify="center">
                  <IconButton
                    variant="solid"
                    size="sm"
                    colorPalette="green"
                    onClick={() => onRedeem(ref)}
                    aria-label="Redeem points"
                    title="Redeem points"
                    disabled={available <= 0}
                  >
                    <MdCardGiftcard />
                  </IconButton>
                  <IconButton
                    variant="subtle"
                    size="sm"
                    colorPalette="purple"
                    onClick={() => onHistory(ref)}
                    aria-label="Redemption history"
                    title="View redemption history"
                  >
                    <MdHistory />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    colorPalette="brand"
                    onClick={() => onView(ref)}
                    aria-label="View reference"
                    title="View details"
                  >
                    <MdVisibility />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    colorPalette="blue"
                    onClick={() => onEdit(ref)}
                    aria-label="Edit reference"
                    title="Edit reference"
                  >
                    <MdEdit />
                  </IconButton>
                  {(isSuperAdmin || isAdmin) && (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      colorPalette="red"
                      onClick={() => onDelete(ref)}
                      aria-label="Delete reference"
                      title="Delete reference"
                    >
                      <MdDelete />
                    </IconButton>
                  )}
                </HStack>
              </Table.Cell>
            </Table.Row>
          );
        }}
      />
    </Box>
  );
};
