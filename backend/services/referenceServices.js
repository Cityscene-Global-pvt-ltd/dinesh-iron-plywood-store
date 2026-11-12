import { v4 as uuidv4 } from "uuid";
import * as repo from "../repositories/referenceRepo.js";
import { toCamelCase } from "../utils/formatter.js";
import {
  processNewNotification,
  removeRelatedNotifications,
} from "../services/notificationServices.js";
import { emitGlobalUpdate } from "../socket.js";

export const getFormattedReferences = async () => {
  const references = await repo.fetchAllReferencesDB();
  return toCamelCase(references);
};

export const createNewReference = async (data, creator, user) => {
  const isSuperAdminAction = user.role === "SUPER_ADMIN";
  const id = uuidv4();

  const referenceData = {
    id,
    referenceNumber: data.referenceNumber,
    name: data.name,
    email: data.email || null,
    mobile: data.mobile,
    address: data.address || null,
    points: data.points || 0,
    redeemedPoints: data.redeemedPoints || 0,
    status: data.status || "Active",
    remarks: data.remarks || null,
    creator,
  };

  await repo.insertReferenceDB(referenceData);

  emitGlobalUpdate(["References"]);

  let targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  if (!isSuperAdminAction) {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "NEW_REFERENCE",
      title: "New Reference Added",
      message: `${referenceData.name} has been added as a new reference by ${user.name} (${user.role}).`,
      reference_module: "references",
      reference_id: id,
    },
    targets,
  );

  return id;
};

export const modifyReference = async (id, data, user) => {
  const isSuperAdminAction = user.role === "SUPER_ADMIN";
  const oldRef = await repo.getReferenceByIdDB(id);
  if (!oldRef) throw new Error("REFERENCE_NOT_FOUND");

  const updateData = {
    name: data.name,
    email: data.email || null,
    mobile: data.mobile,
    address: data.address || null,
    points: data.points !== undefined ? data.points : oldRef.points,
    redeemedPoints: data.redeemedPoints !== undefined ? data.redeemedPoints : oldRef.redeemed_points,
    status: data.status || "Active",
    remarks: data.remarks || null,
  };

  await repo.updateReferenceDB(id, updateData);

  emitGlobalUpdate(["References"]);

  let changes = [];
  if (oldRef.name !== updateData.name) {
    changes.push(`Name: ${oldRef.name} -> ${updateData.name}`);
  }
  if (oldRef.status !== updateData.status) {
    changes.push(`Status: ${oldRef.status} -> ${updateData.status}`);
  }
  if (oldRef.mobile !== updateData.mobile) {
    changes.push(`Mobile: ${oldRef.mobile} -> ${updateData.mobile}`);
  }

  if (changes.length > 0) {
    let targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
    if (!isSuperAdminAction) {
      targets.push({ target_type: "ROLE", target_value: "ADMIN" });
    }

    await processNewNotification(
      {
        type: "REFERENCE_UPDATED",
        title: "Reference Modified",
        message: `${user.name} (${user.role}) updated ${oldRef.name}. Changes: ${changes.join(", ")}`,
        reference_module: "references",
        reference_id: id,
      },
      targets,
    );
  }
};

export const removeReference = async (id, user) => {
  const isSuperAdminAction = user?.role === "SUPER_ADMIN";
  const oldRef = await repo.getReferenceByIdDB(id);
  if (!oldRef) throw new Error("REFERENCE_NOT_FOUND");

  await repo.deleteReferenceDB(id);
  await removeRelatedNotifications(id, "references");

  emitGlobalUpdate(["References"]);

  let targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  if (!isSuperAdminAction) {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "REFERENCE_DELETED",
      title: "Reference Deleted",
      message: `Reference profile of ${oldRef.name} was deleted by ${user.name} (${user.role}).`,
      reference_module: "references",
      reference_id: id,
    },
    targets,
  );
};

export const redeemPoints = async (referenceId, data, user) => {
  const points = Number(data.points);
  if (!points || points <= 0) {
    throw new Error("Points to redeem must be greater than 0");
  }

  const amount = Number(data.amount !== undefined ? data.amount : points);
  const redemptionId = uuidv4();

  const redemptionPayload = {
    id: redemptionId,
    referenceId,
    points,
    amount,
    paymentMode: data.paymentMode || "CASH",
    referenceNo: data.referenceNo || null,
    notes: data.notes || null,
    redemptionDate: data.redemptionDate || new Date().toISOString().split("T")[0],
    createdBy: user?.name || user?.id || "Admin",
  };

  const result = await repo.redeemReferencePointsTx(redemptionPayload);

  emitGlobalUpdate(["References"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  if (user?.role !== "SUPER_ADMIN") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "REFERENCE_REDEEMED",
      title: "Points Redeemed",
      message: `${result.referenceName} redeemed ${points} points (₹${amount.toFixed(2)}) via ${redemptionPayload.paymentMode}. Processed by ${user?.name || "Admin"}.`,
      reference_module: "references",
      reference_id: referenceId,
    },
    targets,
  );

  return result;
};

export const getReferenceRedemptions = async (referenceId) => {
  const redemptions = await repo.getRedemptionsByReferenceIdDB(referenceId);
  return toCamelCase(redemptions);
};

export const getAllRedemptions = async () => {
  const redemptions = await repo.getAllRedemptionsDB();
  return toCamelCase(redemptions);
};

export const cancelRedemption = async (redemptionId, user) => {
  const reverted = await repo.deleteRedemptionTx(redemptionId);
  emitGlobalUpdate(["References"]);

  const targets = [{ target_type: "ROLE", target_value: "SUPER_ADMIN" }];
  if (user?.role !== "SUPER_ADMIN") {
    targets.push({ target_type: "ROLE", target_value: "ADMIN" });
  }

  await processNewNotification(
    {
      type: "REDEMPTION_CANCELLED",
      title: "Redemption Reverted",
      message: `Redemption of ${reverted.points} points was reverted by ${user?.name || "Admin"}. Points restored.`,
      reference_module: "references",
      reference_id: reverted.reference_id,
    },
    targets,
  );

  return reverted;
};
