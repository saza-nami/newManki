// 車の状態を変更するAPI
import express from "express";
import { ApiResult } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";
import e from "express";

const lockCWAR = "LOCK TABLES carTable WRITE, adminTable READ";
const unlock = "UNLOCK TABLES";
const checkStatus =
  "UPDATE carTable SET status = 6 WHERE carId = UUID_TO_BIN(?, 1) AND status = 5";

async function manageCar(adminId: string, carId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockCWAR);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      if (await global.existCarTran(conn, carId)) {
        await db.executeTran(conn, checkStatus, carId);
        result.succeeded = true;
      } else {
        result.reason = "No such car exists.";
      }
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
export default express.Router().post("/manageCar", async (req, res) => {
  try {
    if (
      typeof req.body.adminId === "undefined" ||
      typeof req.body.carId === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await manageCar(req.body.adminId, req.body.carId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
