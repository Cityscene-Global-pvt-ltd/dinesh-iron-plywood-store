import {
  Box,
  Stack,
  Text,
  Table,
  HStack,
  Badge,
  IconButton,
  Grid,
} from "@chakra-ui/react";
import { CustomModal } from "@/components/ui/CustomModal";
import { CustomTable } from "@/components/ui/CustomTable";
import { RedemptionHistoryModalProps, RedemptionRecord } from "@/types/references";
import {
  useGetReferenceRedemptionsQuery,
  useCancelRedemptionMutation,
} from "@/store/apiSlice";
import { formatDate } from "@/utils/dateUtils";
import { CustomSpinner } from "@/components/ui/CustomSpinner";
import { MdDelete } from "react-icons/md";
import { toast } from "@/utils/toast";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { CustomDeleteDialog } from "@/components/ui/CustomDeleteDialog";

export const RedemptionHistoryModal = ({
  isOpen,
  onClose,
  reference,
}: RedemptionHistoryModalProps) => {
  const { isSuperAdmin, isAdmin } = useAuth();
  const {
    data: redemptions = [],
    isLoading,
  } = useGetReferenceRedemptionsQuery(reference?.id || "", {
    skip: !reference?.id || !isOpen,
  });

  const [cancelRedemption, { isLoading: isCancelling }] =
    useCancelRedemptionMutation();
  const [targetToDelete, setTargetToDelete] = useState<RedemptionRecord | null>(
    null,
  );

  if (!reference) return null;

  const totalPoints = Number(reference.points || 0);
  const alreadyRedeemed = Number(reference.redeemedPoints || 0);
  const availablePoints = Math.max(0, totalPoints - alreadyRedeemed);

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
    { label: "Points", align: "end" as const },
    { label: "Amount", align: "end" as const },
    { label: "Mode", align: "center" as const },
    { label: "Ref / Txn No", align: "start" as const },
    { label: "Notes", align: "start" as const },
    { label: "By", align: "start" as const },
    { label: "Action", align: "center" as const },
  ];

  return (
    <>
      <CustomModal
        title="Redemption History"
        open={isOpen}
        onOpenChange={({ open }) => !open && onClose()}
        width="2xl"
        confirmLabel="Close"
        onConfirm={onClose}
      >
        <Stack gap={5}>
          {/* Header Info Banner */}
          <Box
            p={4}
            bg="bg.muted"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="brand.200"
          >
            <HStack justify="space-between" align="start">
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="brand.600" textTransform="uppercase">
                  {reference.referenceNumber || "N/A"}
                </Text>
                <Text fontSize="lg" fontWeight="bold" color="brand.900">
                  {reference.name}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Mobile: {reference.mobile}
                </Text>
              </Box>
              <Badge
                colorPalette="green"
                variant="subtle"
                size="md"
                borderRadius="md"
              >
                {availablePoints} Available
              </Badge>
            </HStack>

            <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3} pt={3} borderTopWidth="1px" borderColor="brand.100">
              <Box textAlign="center">
                <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
                  Total Points
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="blue.600">
                  {totalPoints}
                </Text>
              </Box>
              <Box textAlign="center">
                <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
                  Redeemed
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="orange.600">
                  {alreadyRedeemed}
                </Text>
              </Box>
              <Box textAlign="center">
                <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
                  Total Redemptions
                </Text>
                <Text fontSize="sm" fontWeight="bold" color="purple.600">
                  {redemptions.length}
                </Text>
              </Box>
            </Grid>
          </Box>

          {/* History Table */}
          {isLoading ? (
            <CustomSpinner message="Loading redemption logs..." />
          ) : redemptions.length === 0 ? (
            <Box
              p={6}
              textAlign="center"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="gray.200"
              bg="gray.50"
            >
              <Text color="gray.500" fontSize="sm">
                No redemptions recorded for this reference yet.
              </Text>
            </Box>
          ) : (
            <CustomTable
              columns={columns}
              data={redemptions}
              maxRows={8}
              renderRow={(item: RedemptionRecord) => (
                <Table.Row key={item.id} _hover={{ bg: "brand.50/50" }}>
                  <Table.Cell py={3} fontSize="xs" fontWeight="medium">
                    {formatDate(item.redemptionDate)}
                  </Table.Cell>
                  <Table.Cell py={3} textAlign="end" fontWeight="bold" color="orange.700">
                    {item.points} pts
                  </Table.Cell>
                  <Table.Cell py={3} textAlign="end" fontWeight="bold" color="green.700">
                    ₹{Number(item.amount || 0).toFixed(2)}
                  </Table.Cell>
                  <Table.Cell py={3} textAlign="center">
                    <Badge size="xs" variant="subtle" colorPalette="blue">
                      {item.paymentMode || "CASH"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell py={3} fontSize="xs" color="gray.600">
                    {item.referenceNo || "-"}
                  </Table.Cell>
                  <Table.Cell py={3} fontSize="xs" maxW="180px" truncate color="gray.600">
                    {item.notes || "-"}
                  </Table.Cell>
                  <Table.Cell py={3} fontSize="xs" color="gray.500">
                    {item.createdBy || "-"}
                  </Table.Cell>
                  <Table.Cell py={3} textAlign="center">
                    {(isSuperAdmin || isAdmin) && (
                      <IconButton
                        size="xs"
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
          )}
        </Stack>
      </CustomModal>

      <CustomDeleteDialog
        isOpen={!!targetToDelete}
        onClose={() => setTargetToDelete(null)}
        onConfirm={handleConfirmRevert}
        loading={isCancelling}
        title="Revert Points Redemption?"
        description={`Are you sure you want to revert this redemption of ${targetToDelete?.points} points (₹${targetToDelete?.amount})? The points will be restored to ${reference.name}'s balance.`}
      />
    </>
  );
};

