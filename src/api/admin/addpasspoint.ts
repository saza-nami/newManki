// 通行可能領域登録 API

import express from "express";
import { ApiResult, PassablePoint } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

const addPassable =
  "INSERT INTO passableTable(radius, lat, lng) VALUES(?, ?, ?)";
const lockPWAR = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlock = "UNLOCK TABLES";

async function addPassables(
  adminId: string,
  passPoints: PassablePoint[]
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // check input
  if (typeof adminId === "undefined" && typeof passPoints === "undefined") {
    return report(result);
  }

  const add = passPoints;
  console.log(adminId);
  console.log(add);
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockPWAR);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      for (const i in add) {
        console.log(add[i].position.lat);
        await db.executeTran(conn, addPassable, [
          add[i].radius,
          add[i].position.lat,
          add[i].position.lng,
        ]);
      }
      result.succeeded = true;
    }
    await conn.commit();
    await conn.query(unlock);
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/addPassable", async (req, res) => {
  try {
    res.json(await addPassables(req.body.adminId, req.body.passPoints));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
