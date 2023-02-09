/** 通行可能領域情報を削除する */

import express from "express";
import { ApiResult } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

/** sql */
const lockPWAR = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlock = "UNLOCK TABLES";
const delPassable = "DELETE FROM passableTable WHERE passableId = ?";

/** API から呼び出される関数 */
async function delPassables(
  adminId: string,
  passId: number[]
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const del = passId;
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockPWAR);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      for (const i in del) {
        await db.executeTran(conn, delPassable, [del[i]]);
      }
      result.succeeded = true;
    } else {
      result.reason = "Illegal admin.";
    }
    await conn.commit();
    await conn.query(unlock);
  } catch (err) {
    await conn.rollback();
    if (err instanceof Error) {
      result.reason = err.message;
    }
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

/** delPassable API の実体 */
export default express.Router().post("/delPassable", async (req, res) => {
  try {
    if (
      typeof req.body.adminId === "undefined" ||
      typeof req.body.passId === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await delPassables(req.body.adminId, req.body.passId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
