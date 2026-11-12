import db from "../config/db.js";

export const fetchAllReferencesDB = async () => {
  const [rows] = await db.query(
    `SELECT * FROM \`references\` ORDER BY created_at DESC`,
  );
  return rows;
};

export const getReferenceByIdDB = async (id) => {
  const [rows] = await db.query(`SELECT * FROM \`references\` WHERE id = ?`, [
    id,
  ]);
  return rows[0];
};

export const insertReferenceDB = async (data) => {
  const query = `
    INSERT INTO \`references\` (
      id, reference_number, name, email, mobile, address, 
      points, redeemed_points, status, remarks, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  await db.query(query, [
    data.id,
    data.referenceNumber,
    data.name,
    data.email,
    data.mobile,
    data.address,
    data.points,
    data.redeemedPoints,
    data.status,
    data.remarks,
    data.creator,
  ]);
};

export const updateReferenceDB = async (id, data) => {
  const query = `
    UPDATE \`references\` 
    SET name = ?, email = ?, mobile = ?, address = ?, points = ?, 
        redeemed_points = ?, status = ?, remarks = ?, updated_at = NOW()
    WHERE id = ?
  `;
  const [result] = await db.query(query, [
    data.name,
    data.email,
    data.mobile,
    data.address,
    data.points,
    data.redeemedPoints,
    data.status,
    data.remarks,
    id,
  ]);
  return result.affectedRows;
};

export const deleteReferenceDB = async (id) => {
  const [result] = await db.query(`DELETE FROM \`references\` WHERE id = ?`, [
    id,
  ]);
  return result.affectedRows;
};

export const redeemReferencePointsTx = async (redemptionData) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [refRows] = await connection.query(
      `SELECT id, name, points, redeemed_points, status FROM \`references\` WHERE id = ? FOR UPDATE`,
      [redemptionData.referenceId],
    );

    if (refRows.length === 0) {
      throw new Error("REFERENCE_NOT_FOUND");
    }

    const ref = refRows[0];
    const currentPoints = Number(ref.points || 0);
    const alreadyRedeemed = Number(ref.redeemed_points || 0);
    const availablePoints = currentPoints - alreadyRedeemed;

    if (redemptionData.points > availablePoints) {
      throw new Error(`INSUFFICIENT_POINTS: Available points are ${availablePoints}, requested ${redemptionData.points}`);
    }

    await connection.query(
      `INSERT INTO reference_redemptions (
        id, reference_id, points, amount, payment_mode, reference_no, 
        notes, redemption_date, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        redemptionData.id,
        redemptionData.referenceId,
        redemptionData.points,
        redemptionData.amount,
        redemptionData.paymentMode || "CASH",
        redemptionData.referenceNo || null,
        redemptionData.notes || null,
        redemptionData.redemptionDate,
        redemptionData.createdBy || null,
      ],
    );

    const updatedRedeemedPoints = alreadyRedeemed + Number(redemptionData.points);
    await connection.query(
      `UPDATE \`references\` SET redeemed_points = ?, updated_at = NOW() WHERE id = ?`,
      [updatedRedeemedPoints, redemptionData.referenceId],
    );

    await connection.commit();
    return {
      referenceId: redemptionData.referenceId,
      referenceName: ref.name,
      redeemedPoints: updatedRedeemedPoints,
      availablePoints: currentPoints - updatedRedeemedPoints,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getRedemptionsByReferenceIdDB = async (referenceId) => {
  const [rows] = await db.query(
    `SELECT rr.*, r.name as reference_name, r.reference_number, r.mobile as reference_mobile
     FROM reference_redemptions rr
     JOIN \`references\` r ON rr.reference_id = r.id
     WHERE rr.reference_id = ?
     ORDER BY rr.redemption_date DESC, rr.created_at DESC`,
    [referenceId],
  );
  return rows;
};

export const getAllRedemptionsDB = async () => {
  const [rows] = await db.query(
    `SELECT rr.*, r.name as reference_name, r.reference_number, r.mobile as reference_mobile
     FROM reference_redemptions rr
     JOIN \`references\` r ON rr.reference_id = r.id
     ORDER BY rr.redemption_date DESC, rr.created_at DESC`,
  );
  return rows;
};

export const deleteRedemptionTx = async (redemptionId) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT * FROM reference_redemptions WHERE id = ? FOR UPDATE`,
      [redemptionId],
    );

    if (rows.length === 0) {
      throw new Error("REDEMPTION_NOT_FOUND");
    }

    const redemption = rows[0];

    await connection.query(
      `UPDATE \`references\` 
       SET redeemed_points = GREATEST(0, redeemed_points - ?), updated_at = NOW() 
       WHERE id = ?`,
      [redemption.points, redemption.reference_id],
    );

    await connection.query(
      `DELETE FROM reference_redemptions WHERE id = ?`,
      [redemptionId],
    );

    await connection.commit();
    return redemption;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
