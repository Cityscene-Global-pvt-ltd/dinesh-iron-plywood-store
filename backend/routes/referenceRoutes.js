import express from "express";
import {
  createReference,
  deleteReference,
  getAllReferences,
  updateReference,
  redeemPoints,
  getReferenceRedemptions,
  getAllRedemptions,
  cancelRedemption,
} from "../controllers/referenceController.js";

const router = express.Router();

router.get("/redemptions/all", getAllRedemptions);
router.delete("/redemptions/:redemptionId", cancelRedemption);

router.post("/", createReference);
router.get("/", getAllReferences);
router.put("/:id", updateReference);
router.delete("/:id", deleteReference);

router.post("/:id/redeem", redeemPoints);
router.get("/:id/redemptions", getReferenceRedemptions);

export default router;
