/* 管理者終了 */
import express from "express";
import { ApiResult } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

async function terminateAdmin(adminId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // check input
  if (typeof adminId === "undefined") {
    return report(result);
  }
  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      result.succeeded = await admin.executeTerminateAdminTran(conn, adminId);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/terminateAdmin", async (req, res) => {
  try {
    res.json(await terminateAdmin(req.body.adminId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
