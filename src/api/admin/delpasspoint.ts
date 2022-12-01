/* 通行可能領域削除 */

import express from "express";
import { ApiResult } from "../../types";
import * as admin from "./admin";
import * as db from "../../database";
import report from "../_report";

interface delInfo {
  passId: number[];
  mode?: string;
}

const lockTablesSql = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlockTableSql = "UNLOCK TABLES";
const delPassableSql = "DELETE FROM passableTable WHERE passableId = ?";

async function delPassable(
  adminId: string,
  delInfo: delInfo
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // check input
  if (typeof adminId === "undefined" && typeof delInfo === "undefined") {
    return report(result);
  }

  const del = delInfo.passId;
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockTablesSql);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      if (delInfo.mode === "selected" || delInfo.mode === undefined) {
        for (const i in del) {
          await db.executeTran(conn, delPassableSql, [del[i]]);
        }
      }
      if (
        delInfo.mode === "range" &&
        delInfo.passId.length === 2 &&
        delInfo.passId[0] < delInfo.passId[1]
      ) {
        console.log(delInfo.passId[0], delInfo.passId[1]);
        for (let i = delInfo.passId[0]; i <= delInfo.passId[1]; i++) {
          await db.executeTran(conn, delPassableSql, [i]);
        }
      }
      result.succeeded = true;
    }
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

export default express.Router().post("/delPassable", async (req, res) => {
  try {
    res.json(await delPassable(req.body.adminId, req.body.delInfo));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
