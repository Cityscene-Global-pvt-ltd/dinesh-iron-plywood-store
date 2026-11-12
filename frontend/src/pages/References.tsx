import { useState, useMemo } from "react";
import {
  Box,
  Heading,
  HStack,
  Stack,
  Flex,
  Text,
  Icon,
  Badge,
  Tabs,
  SimpleGrid,
} from "@chakra-ui/react";
import { Button } from "@/components/ui/button";
import {
  MdAdd,
  MdOutlineDownload,
  MdPeopleOutline,
  MdCardGiftcard,
  MdStars,
  MdHistory,
} from "react-icons/md";
import { ReferenceTable } from "@/components/references/ReferenceTable";
import { ReferenceModal } from "@/components/references/ReferenceModal";
import { RedeemModal } from "@/components/references/RedeemModal";
import { RedemptionHistoryModal } from "@/components/references/RedemptionHistoryModal";
import { AllRedemptionsTable } from "@/components/references/AllRedemptionsTable";
import { Reference, RedemptionRecord } from "@/types/references";
import {
  useAddReferenceMutation,
  useDeleteReferenceMutation,
  useGetReferencesQuery,
  useUpdateReferenceMutation,
  useGetAllRedemptionsQuery,
} from "@/store/apiSlice";
import { CustomDeleteDialog } from "@/components/ui/CustomDeleteDialog";
import { toast } from "@/utils/toast";
import SearchBar from "@/components/ui/SearchBar";
import {
  transformReferenceData,
  transformRedemptionData,
} from "@/exportConfigs/referenceExport";
import { handleExport } from "@/utils/export";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export const References = () => {
  const { exportFormat } = useSystemSettings();
  const { data: allReferences = [], isLoading: isReferencesLoading } =
    useGetReferencesQuery();
  const { data: allRedemptions = [], isLoading: isRedemptionsLoading } =
    useGetAllRedemptionsQuery();

  const [createReference] = useAddReferenceMutation();
  const [deleteReference, { isLoading: isDeleting }] =
    useDeleteReferenceMutation();
  const [updateReference] = useUpdateReferenceMutation();

  const [activeTab, setActiveTab] = useState<string>("references");
  const [searchQuery, setSearchQuery] = useState("");
  const [redemptionsSearch, setRedemptionsSearch] = useState("");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState<Reference | undefined>(
    undefined,
  );
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [referenceToDelete, setReferenceToDelete] = useState<Reference | null>(
    null,
  );

  // Redeem modal state
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [refToRedeem, setRefToRedeem] = useState<Reference | null>(null);

  // History modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [refForHistory, setRefForHistory] = useState<Reference | null>(null);

  // Filtered References
  const filteredReferences = useMemo(() => {
    return allReferences.filter(
      (ref: Reference) =>
        ref.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ref.mobile?.includes(searchQuery) ||
        ref.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ref.email &&
          ref.email.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [allReferences, searchQuery]);

  // Filtered Redemptions
  const filteredRedemptions = useMemo(() => {
    return allRedemptions.filter(
      (red: RedemptionRecord) =>
        red.referenceName?.toLowerCase().includes(redemptionsSearch.toLowerCase()) ||
        red.referenceMobile?.includes(redemptionsSearch) ||
        red.referenceNumber?.toLowerCase().includes(redemptionsSearch.toLowerCase()) ||
        red.referenceNo?.toLowerCase().includes(redemptionsSearch.toLowerCase()) ||
        (red.notes &&
          red.notes.toLowerCase().includes(redemptionsSearch.toLowerCase())),
    );
  }, [allRedemptions, redemptionsSearch]);

  // High-Level KPI Summary Calculations
  const stats = useMemo(() => {
    const totalRefs = allReferences.length;
    let totalPoints = 0;
    let totalRedeemed = 0;

    for (const r of allReferences) {
      totalPoints += Number(r.points || 0);
      totalRedeemed += Number(r.redeemedPoints || 0);
    }

    const availablePoints = Math.max(0, totalPoints - totalRedeemed);

    let totalPayoutAmount = 0;
    for (const red of allRedemptions) {
      totalPayoutAmount += Number(red.amount || 0);
    }

    return {
      totalRefs,
      totalPoints,
      totalRedeemed,
      availablePoints,
      totalPayoutAmount,
    };
  }, [allReferences, allRedemptions]);

  const handleOpenModal = (mode: "add" | "edit" | "view", ref?: Reference) => {
    setModalMode(mode);
    setSelectedRef(ref);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRef(undefined);
  };

  const handleOpenRedeem = (ref: Reference) => {
    setRefToRedeem(ref);
    setIsRedeemOpen(true);
  };

  const handleOpenHistory = (ref: Reference) => {
    setRefForHistory(ref);
    setIsHistoryOpen(true);
  };

  const handleSubmit = async (data: Reference) => {
    try {
      if (modalMode === "add") {
        const currentYear = new Date().getFullYear();
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const referenceNumber = `REF-${currentYear}-${randomPart}`;

        const finalData = {
          ...data,
          referenceNumber,
          status: data.status || "Active",
        };

        await createReference(finalData).unwrap();
        toast.success("Reference Created Successfully");
      } else if (modalMode === "edit") {
        await updateReference({ id: data.id, ...data }).unwrap();
        toast.success("Reference Updated Successfully");
      }
      handleCloseModal();
    } catch (error: any) {
      const errorMessage = error?.data?.message || "Operation failed!";
      toast.error(errorMessage);
    }
  };

  const handleDeleteClick = (ref: Reference) => {
    setReferenceToDelete(ref);
  };

  const handleConfirmDelete = async () => {
    if (referenceToDelete) {
      try {
        await deleteReference(referenceToDelete.id).unwrap();
        setReferenceToDelete(null);
        toast.success("Reference Deleted Successfully");
      } catch (error) {
        toast.error("Failed to Delete!");
      }
    }
  };

  const handleExportReferences = () => {
    const data = transformReferenceData(filteredReferences);
    handleExport(data, exportFormat, "References_List");
  };

  const handleExportRedemptions = () => {
    const data = transformRedemptionData(filteredRedemptions);
    handleExport(data, exportFormat, "Redemptions_Log");
  };

  return (
    <Box p={{ base: 4, md: 8 }} maxW="7xl" mx="auto">
      <Stack gap={6}>
        {/* Top Header Banner */}
        <Flex
          justify="space-between"
          align="center"
          bg="white"
          p={6}
          borderRadius="xl"
          border="1px solid"
          borderColor="brand.100"
          shadow="sm"
          wrap="wrap"
          gap={4}
        >
          <HStack gap={4}>
            <Box p={3} bg="brand.50" borderRadius="xl" color="brand.600">
              <Icon as={MdPeopleOutline} boxSize={7} />
            </Box>
            <Box>
              <HStack gap={2} mb={0.5}>
                <Heading
                  size="lg"
                  letterSpacing="tight"
                  color="brand.900"
                  lineHeight="short"
                >
                  References & Loyalty Rewards
                </Heading>
                <Badge
                  colorPalette="brand"
                  variant="subtle"
                  size="sm"
                  borderRadius="md"
                >
                  Network
                </Badge>
              </HStack>
              <Text color="brand.500" fontSize="sm" fontWeight="medium">
                Manage business references, track points earned from sales, and redeem rewards
              </Text>
            </Box>
          </HStack>

          <Button
            onClick={() => handleOpenModal("add")}
            colorPalette="brand"
            size="md"
            px={6}
            fontWeight="bold"
            borderRadius="lg"
            shadow="sm"
            _hover={{ transform: "translateY(-1px)", shadow: "md" }}
          >
            <Icon as={MdAdd} mr={1} boxSize={5} /> Add Reference
          </Button>
        </Flex>

        {/* High-Level KPI Summary Cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          {/* Total References */}
          <Box
            p={4}
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            shadow="xs"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                Total References
              </Text>
              <Box p={2} bg="blue.50" borderRadius="lg" color="blue.600">
                <Icon as={MdPeopleOutline} boxSize={5} />
              </Box>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="brand.900">
              {stats.totalRefs}
            </Text>
            <Text fontSize="2xs" color="gray.500" mt={1}>
              Active business referrers
            </Text>
          </Box>

          {/* Points Earned */}
          <Box
            p={4}
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            shadow="xs"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                Points Earned
              </Text>
              <Box p={2} bg="blue.50" borderRadius="lg" color="blue.600">
                <Icon as={MdStars} boxSize={5} />
              </Box>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="blue.700">
              {stats.totalPoints.toLocaleString()}
            </Text>
            <Text fontSize="2xs" color="gray.500" mt={1}>
              Lifetime referral points
            </Text>
          </Box>

          {/* Points Redeemed */}
          <Box
            p={4}
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            shadow="xs"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                Points Redeemed
              </Text>
              <Box p={2} bg="orange.50" borderRadius="lg" color="orange.600">
                <Icon as={MdHistory} boxSize={5} />
              </Box>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="orange.600">
              {stats.totalRedeemed.toLocaleString()}
            </Text>
            <Text fontSize="2xs" color="gray.500" mt={1}>
              ₹{stats.totalPayoutAmount.toLocaleString("en-IN", { minimumFractionDigits: 0 })} paid out
            </Text>
          </Box>

          {/* Available Points */}
          <Box
            p={4}
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.200"
            shadow="xs"
          >
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                Available Balance
              </Text>
              <Box p={2} bg="green.50" borderRadius="lg" color="green.600">
                <Icon as={MdCardGiftcard} boxSize={5} />
              </Box>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="green.600">
              {stats.availablePoints.toLocaleString()}
            </Text>
            <Text fontSize="2xs" color="gray.500" mt={1}>
              Ready for redemption
            </Text>
          </Box>
        </SimpleGrid>

        {/* Tabs for Managing References vs All Redemptions */}
        <Tabs.Root
          lazyMount
          value={activeTab}
          onValueChange={(e) => setActiveTab(e.value)}
        >
          <Tabs.List bg="bg.muted" p="1" borderRadius="xl" width="fit-content" mb={4}>
            <Tabs.Trigger value="references" px={5} py={2} fontWeight="bold">
              <Icon as={MdPeopleOutline} mr={2} />
              References Directory ({allReferences.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="redemptions" px={5} py={2} fontWeight="bold">
              <Icon as={MdCardGiftcard} mr={2} />
              Redemption Logs ({allRedemptions.length})
            </Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>

          {/* Tab 1: References Directory */}
          <Tabs.Content value="references">
            <Stack gap={4}>
              <HStack gap="4" width="full">
                <Box flex="1">
                  <SearchBar
                    placeholder="Search by name, mobile, reference number..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                  />
                </Box>
                <Button
                  variant="outline"
                  color="brand.500"
                  onClick={handleExportReferences}
                >
                  <MdOutlineDownload size="20px" /> Export
                </Button>
              </HStack>

              <ReferenceTable
                references={filteredReferences}
                onView={(ref) => handleOpenModal("view", ref)}
                onEdit={(ref) => handleOpenModal("edit", ref)}
                onDelete={handleDeleteClick}
                onRedeem={handleOpenRedeem}
                onHistory={handleOpenHistory}
                isLoading={isReferencesLoading}
              />
            </Stack>
          </Tabs.Content>

          {/* Tab 2: All Redemptions Log */}
          <Tabs.Content value="redemptions">
            <Stack gap={4}>
              <HStack gap="4" width="full">
                <Box flex="1">
                  <SearchBar
                    placeholder="Search redemptions by reference name, mobile, txn number..."
                    value={redemptionsSearch}
                    onChange={setRedemptionsSearch}
                  />
                </Box>
                <Button
                  variant="outline"
                  color="brand.500"
                  onClick={handleExportRedemptions}
                >
                  <MdOutlineDownload size="20px" /> Export Log
                </Button>
              </HStack>

              <AllRedemptionsTable
                redemptions={filteredRedemptions}
                isLoading={isRedemptionsLoading}
              />
            </Stack>
          </Tabs.Content>
        </Tabs.Root>
      </Stack>

      {/* Reference Create / Edit / View Modal */}
      <ReferenceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        reference={selectedRef}
        mode={modalMode}
      />

      {/* Redeem Points Modal */}
      <RedeemModal
        isOpen={isRedeemOpen}
        onClose={() => {
          setIsRedeemOpen(false);
          setRefToRedeem(null);
        }}
        reference={refToRedeem}
      />

      {/* Reference Redemption History Modal */}
      <RedemptionHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setRefForHistory(null);
        }}
        reference={refForHistory}
      />

      {/* Delete Confirmation Dialog */}
      <CustomDeleteDialog
        isOpen={!!referenceToDelete}
        onClose={() => setReferenceToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title="Delete Reference?"
        description={`Are you sure you want to delete reference ${referenceToDelete?.name}? This action will permanently remove the reference and related records.`}
      />
    </Box>
  );
};

export default References;
