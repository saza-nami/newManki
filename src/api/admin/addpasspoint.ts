// 通行可能領域登録 API

import express from "express";
import { ApiResult, PassablePoint } from "../../types";
import * as admin from "./admin";
import * as db from "../../database";
import report from "../_report";

const addPassableSql =
  "INSERT INTO passableTable(radius, lat, lng) VALUES(?, ?, ?)";
const lockTablesSql = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlockTableSql = "UNLOCK TABLES";

async function addPassable(
  adminId: string,
  passPoints: PassablePoint[]
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // check input
  if (typeof adminId === "undefined" && typeof passPoints === "undefined") {
    return report(result);
  }

  const add = passPoints;
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockTablesSql);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      for (const i in add) {
        await db.executeTran(conn, addPassableSql, [
          add[i].radius,
          add[i].position.lat,
          add[i].position.lng,
        ]);
      }
    }
    result.succeeded = true;
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlockTableSql);
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/addPassable", async (req, res) => {
  try {
    res.json(await addPassable(req.body.adminId, req.body.data));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
