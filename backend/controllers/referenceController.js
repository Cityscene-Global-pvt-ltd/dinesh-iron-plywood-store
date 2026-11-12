import * as referenceService from "../services/referenceServices.js";

export const getAllReferences = async (req, res) => {
  try {
    const data = await referenceService.getFormattedReferences();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching references" });
  }
};

export const createReference = async (req, res) => {
  try {
    const { name, mobile, referenceNumber } = req.body;

    if (!name || !mobile || !referenceNumber) {
      return res
        .status(400)
        .json({ message: "Name, Mobile, and Reference Number are required" });
    }
    const user = req.user;

    const creator = user?.id || "";
    const id = await referenceService.createNewReference(
      req.body,
      creator,
      user,
    );

    res.status(201).json({ message: "Reference created successfully", id });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Reference Number or Mobile already exists" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateReference = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile } = req.body;
    const user = req.user;

    if (!id || !name || !mobile) {
      return res
        .status(400)
        .json({ message: "ID, Name, and Mobile are required" });
    }

    await referenceService.modifyReference(id, req.body, user);
    res.status(200).json({ message: "Reference updated successfully" });
  } catch (error) {
    if (error.message === "REFERENCE_NOT_FOUND") {
      return res.status(404).json({ message: "Reference not found" });
    }
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Mobile number already exists" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteReference = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }
    const user = req.user;

    await referenceService.removeReference(id, user);
    res.status(200).json({ message: "Reference deleted successfully" });
  } catch (error) {
    if (error.message === "REFERENCE_NOT_FOUND") {
      return res.status(404).json({ message: "Reference not found" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const redeemPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const result = await referenceService.redeemPoints(id, req.body, user);
    res.status(200).json({ message: "Points redeemed successfully", data: result });
  } catch (error) {
    if (error.message === "REFERENCE_NOT_FOUND") {
      return res.status(404).json({ message: "Reference not found" });
    }
    if (error.message.startsWith("INSUFFICIENT_POINTS") || error.message.includes("greater than 0")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || "Failed to redeem points" });
  }
};

export const getReferenceRedemptions = async (req, res) => {
  try {
    const { id } = req.params;
    const redemptions = await referenceService.getReferenceRedemptions(id);
    res.status(200).json(redemptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching redemptions" });
  }
};

export const getAllRedemptions = async (req, res) => {
  try {
    const redemptions = await referenceService.getAllRedemptions();
    res.status(200).json(redemptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all redemptions" });
  }
};

export const cancelRedemption = async (req, res) => {
  try {
    const { redemptionId } = req.params;
    const user = req.user;
    const reverted = await referenceService.cancelRedemption(redemptionId, user);
    res.status(200).json({ message: "Redemption reverted successfully", data: reverted });
  } catch (error) {
    if (error.message === "REDEMPTION_NOT_FOUND") {
      return res.status(404).json({ message: "Redemption not found" });
    }
    res.status(500).json({ message: error.message || "Failed to cancel redemption" });
  }
};
