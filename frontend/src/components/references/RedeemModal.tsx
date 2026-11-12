import {
  Input,
  Stack,
  Grid,
  Field,
  Text,
  Textarea,
  Box,
  HStack,
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
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/ui/CustomModal";
import { useState, useEffect } from "react";
import { RedeemModalProps } from "@/types/references";
import { useRedeemReferencePointsMutation } from "@/store/apiSlice";
import { toast } from "@/utils/toast";
import { getISTDateString } from "@/utils/dateUtils";

export const RedeemModal = ({
  isOpen,
  onClose,
  reference,
  onSuccess,
}: RedeemModalProps) => {
  const [redeemPoints, { isLoading }] = useRedeemReferencePointsMutation();

  const [points, setPoints] = useState<number | "">("");
  const [amount, setAmount] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [redemptionDate, setRedemptionDate] = useState<string>(
    getISTDateString(new Date()),
  );

  const totalPoints = Number(reference?.points || 0);
  const alreadyRedeemed = Number(reference?.redeemedPoints || 0);
  const availablePoints = Math.max(0, totalPoints - alreadyRedeemed);

  useEffect(() => {
    if (isOpen) {
      setPoints("");
      setAmount("");
      setPaymentMode("CASH");
      setReferenceNo("");
      setNotes("");
      setRedemptionDate(getISTDateString(new Date()));
    }
  }, [isOpen, reference]);

  const handlePointsChange = (val: string) => {
    if (val === "") {
      setPoints("");
      setAmount("");
      return;
    }
    const num = Number(val);
    if (num < 0) return;
    setPoints(num);
    setAmount(num); // Default 1 pt = ₹1
  };

  const handleRedeemAll = () => {
    setPoints(availablePoints);
    setAmount(availablePoints);
  };

  const handleConfirm = async () => {
    if (!reference?.id) return;

    const numPoints = Number(points);
    if (!numPoints || numPoints <= 0) {
      toast.error("Please enter valid points to redeem (greater than 0)");
      return;
    }

    if (numPoints > availablePoints) {
      toast.error(
        `Cannot redeem more than available points (${availablePoints} pts available)`,
      );
      return;
    }

    try {
      await redeemPoints({
        id: reference.id,
        points: numPoints,
        amount: Number(amount) || numPoints,
        paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
        redemptionDate,
      }).unwrap();

      toast.success(
        `Successfully redeemed ${numPoints} points for ${reference.name}!`,
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to redeem points");
    }
  };

  const paymentModes = createListCollection({
    items: [
      { label: "Cash", value: "CASH" },
      { label: "UPI / Online", value: "UPI" },
      { label: "Bank Transfer (NEFT/RTGS)", value: "BANK_TRANSFER" },
      { label: "Cheque", value: "CHEQUE" },
      { label: "Discount / Bill Credit", value: "DISCOUNT" },
      { label: "Gift / Voucher", value: "GIFT_VOUCHER" },
    ],
  });

  return (
    <CustomModal
      title="Redeem Reference Points"
      open={isOpen}
      onOpenChange={({ open }) => !open && onClose()}
      onConfirm={handleConfirm}
      confirmLabel="Confirm Redemption"
      loading={isLoading}
      disableConfirm={availablePoints <= 0}
    >
      <Stack gap={5}>
        {/* Reference Info Card */}
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
                {reference?.referenceNumber || "N/A"}
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="brand.900">
                {reference?.name || "Unknown"}
              </Text>
              <Text fontSize="xs" color="gray.600">
                Mobile: {reference?.mobile || "N/A"}
              </Text>
            </Box>
            <Badge
              colorPalette={availablePoints > 0 ? "green" : "red"}
              variant="solid"
              size="lg"
              borderRadius="md"
              px={3}
              py={1}
            >
              {availablePoints} Pts Available
            </Badge>
          </HStack>

          {/* Points Breakdown */}
          <Grid templateColumns="repeat(3, 1fr)" gap={3} mt={4} pt={3} borderTopWidth="1px" borderColor="brand.100">
            <Box textAlign="center">
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
                Total Earned
              </Text>
              <Text fontSize="md" fontWeight="bold" color="blue.600">
                {totalPoints}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
                Already Redeemed
              </Text>
              <Text fontSize="md" fontWeight="bold" color="orange.600">
                {alreadyRedeemed}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
                Balance Remaining
              </Text>
              <Text fontSize="md" fontWeight="bold" color="green.600">
                {availablePoints}
              </Text>
            </Box>
          </Grid>
        </Box>

        {availablePoints <= 0 ? (
          <Box
            p={4}
            bg="red.50"
            borderWidth="1px"
            borderColor="red.200"
            borderRadius="lg"
            textAlign="center"
          >
            <Text color="red.700" fontWeight="medium" fontSize="sm">
              This reference has 0 available points to redeem.
            </Text>
          </Box>
        ) : (
          <>
            {/* Redemption Inputs */}
            <Grid templateColumns="2fr 1fr" gap={4}>
              <Field.Root required>
                <Field.Label>
                  Points to Redeem *
                  <Text as="span" fontSize="xs" color="gray.500" ml={2}>
                    (Max: {availablePoints})
                  </Text>
                </Field.Label>
                <HStack gap={2}>
                  <Input
                    type="number"
                    value={points}
                    placeholder={`e.g. ${Math.min(1000, availablePoints)}`}
                    min={1}
                    max={availablePoints}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="brand"
                    onClick={handleRedeemAll}
                    disabled={availablePoints <= 0}
                  >
                    Max
                  </Button>
                </HStack>
              </Field.Root>

              <Field.Root required>
                <Field.Label>Amount (₹) *</Field.Label>
                <Input
                  type="number"
                  value={amount}
                  placeholder="₹ Amount"
                  min={0}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </Field.Root>
            </Grid>

            <Grid templateColumns="1fr 1fr" gap={4}>
              <Field.Root required>
                <Field.Label>Payment Mode *</Field.Label>
                <SelectRoot
                  collection={paymentModes}
                  value={[paymentMode]}
                  onValueChange={(details) => setPaymentMode(details.value[0] || "CASH")}
                >
                  <SelectTrigger>
                    <SelectValueText placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent portalRef={undefined}>
                    {paymentModes.items.map((mode) => (
                      <SelectItem key={mode.value} item={mode}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
              </Field.Root>

              <Field.Root required>
                <Field.Label>Redemption Date *</Field.Label>
                <Input
                  type="date"
                  value={redemptionDate}
                  onChange={(e) => setRedemptionDate(e.target.value)}
                />
              </Field.Root>
            </Grid>

            <Field.Root>
              <Field.Label>Transaction / Cheque / Reference No</Field.Label>
              <Input
                placeholder="e.g. UTR12345678, CHQ-998811"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Notes / Remarks</Field.Label>
              <Textarea
                placeholder="e.g. Diwali bonus settlement, paid via cash voucher"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field.Root>
          </>
        )}
      </Stack>
    </CustomModal>
  );
};
