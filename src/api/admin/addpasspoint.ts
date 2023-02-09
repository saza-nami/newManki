/** 通行可能領域を追加する */

import express from "express";
import { ApiResult, PassablePoint } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

/** sql */
const addPassable =
  "INSERT INTO passableTable(radius, lat, lng) VALUES(?, ?, ?)";
const lockPWAR = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlock = "UNLOCK TABLES";

/** API から呼び出される関数 */
async function addPassables(
  adminId: string,
  passPoints: PassablePoint[]
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const add = passPoints;
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockPWAR);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      for (const i in add) {
        await db.executeTran(conn, addPassable, [
          add[i].radius,
          add[i].position.lat,
          add[i].position.lng,
        ]);
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

/** addPassable API の実体 */
export default express.Router().post("/addPassable", async (req, res) => {
  try {
    if (
      typeof req.body.adminId === "undefined" ||
      typeof req.body.passPoints === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await addPassables(req.body.adminId, req.body.passPoints));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
