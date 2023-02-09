/** 管理者の識別子を無効にする */

import express from "express";
import { ApiResult } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

/** sql */
const endAdmin =
  "UPDATE adminTable SET adminId = null, endAt = NOW() WHERE adminId = UUID_TO_BIN(?, 1)";

/** API から呼び出される関数 */
async function terminateAdmin(adminId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      await db.executeTran(conn, endAdmin, [adminId]);
      result.succeeded = true;
    } else {
      result.reason = "Illegal admin.";
    }
    await conn.commit();
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

/** terminateAdmin API の実体 */
export default express.Router().post("/terminateAdmin", async (req, res) => {
  try {
    if (typeof req.body.adminId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await terminateAdmin(req.body.adminId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
