import {
  Box,
  HStack,
  Table,
  Badge,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CustomTable } from "../ui/CustomTable";
import { MdDelete } from "react-icons/md";
import { RedemptionRecord } from "@/types/references";
import { CustomSpinner } from "../ui/CustomSpinner";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/dateUtils";
import { useState } from "react";
import { CustomDeleteDialog } from "../ui/CustomDeleteDialog";
import { useCancelRedemptionMutation } from "@/store/apiSlice";
import { toast } from "@/utils/toast";

interface Props {
  redemptions: RedemptionRecord[];
  isLoading: boolean;
}

export const AllRedemptionsTable = ({ redemptions, isLoading }: Props) => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const [cancelRedemption, { isLoading: isCancelling }] =
    useCancelRedemptionMutation();
  const [targetToDelete, setTargetToDelete] = useState<RedemptionRecord | null>(
    null,
  );

  const handleConfirmRevert = async () => {
    if (!targetToDelete) return;
    try {
      await cancelRedemption(targetToDelete.id).unwrap();
      toast.success(
        `Redemption of ${targetToDelete.points} points reverted successfully!`,
      );
      setTargetToDelete(null);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to revert redemption");
    }
  };

  const columns = [
    { label: "Date", align: "start" as const },
    { label: "Reference", align: "start" as const },
    { label: "Points Redeemed", align: "end" as const },
    { label: "Amount Paid", align: "end" as const },
    { label: "Payment Mode", align: "center" as const },
    { label: "Txn / Ref No", align: "start" as const },
    { label: "Notes", align: "start" as const },
    { label: "Processed By", align: "start" as const },
    { label: "Action", align: "center" as const },
  ];

  if (isLoading) return <CustomSpinner message="Fetching Redemptions" />;

  if (redemptions.length === 0) {
    return (
      <Box
        bg="bg.panel"
        p={12}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="brand.200"
        textAlign="center"
      >
        <Text color="gray.500" fontSize="md">
          No redemption records found.
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box
        bg="bg.panel"
        p={6}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="brand.200"
      >
        <CustomTable
          columns={columns}
          data={redemptions}
          renderRow={(item: RedemptionRecord) => (
            <Table.Row key={item.id} _hover={{ bg: "brand.50" }}>
              <Table.Cell py={4} px={4} fontSize="xs" fontWeight="medium">
                {formatDate(item.redemptionDate)}
              </Table.Cell>
              <Table.Cell py={4} px={4}>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold" fontSize="sm">
                    {item.referenceName || "N/A"}
                  </Text>
                  <HStack gap={2}>
                    <Text fontSize="2xs" color="gray.500">
                      {item.referenceNumber || ""}
                    </Text>
                    {item.referenceMobile && (
                      <Text fontSize="2xs" color="gray.600">
                        • {item.referenceMobile}
                      </Text>
                    )}
                  </HStack>
                </VStack>
              </Table.Cell>
              <Table.Cell py={4} px={4} textAlign="end" fontWeight="bold" color="orange.600">
                {item.points} pts
              </Table.Cell>
              <Table.Cell py={4} px={4} textAlign="end" fontWeight="bold" color="green.700">
                ₹{Number(item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Table.Cell>
              <Table.Cell py={4} px={4} textAlign="center">
                <Badge size="sm" variant="subtle" colorPalette="blue">
                  {item.paymentMode || "CASH"}
                </Badge>
              </Table.Cell>
              <Table.Cell py={4} px={4} fontSize="xs" color="gray.600">
                {item.referenceNo || "-"}
              </Table.Cell>
              <Table.Cell py={4} px={4} fontSize="xs" maxW="200px" truncate color="gray.600">
                {item.notes || "-"}
              </Table.Cell>
              <Table.Cell py={4} px={4} fontSize="xs" color="gray.500">
                {item.createdBy || "-"}
              </Table.Cell>
              <Table.Cell py={4} px={4} textAlign="center">
                {(isSuperAdmin || isAdmin) && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => setTargetToDelete(item)}
                    aria-label="Revert redemption"
                    title="Revert redemption (restores points)"
                  >
                    <MdDelete />
                  </IconButton>
                )}
              </Table.Cell>
            </Table.Row>
          )}
        />
      </Box>

      <CustomDeleteDialog
        isOpen={!!targetToDelete}
        onClose={() => setTargetToDelete(null)}
        onConfirm={handleConfirmRevert}
        loading={isCancelling}
        title="Revert Points Redemption?"
        description={`Are you sure you want to revert this redemption of ${targetToDelete?.points} points (₹${targetToDelete?.amount}) for ${targetToDelete?.referenceName}? The points will be restored back to their balance.`}
      />
    </>
  );
};

