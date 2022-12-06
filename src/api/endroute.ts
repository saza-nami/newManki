// 命令を終了するときに呼ばれるAPI

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

const lockTableSql =
  "LOCK TABLES orderTable WRITE, carTable WRITE, userTable READ";
const unlockTableSql = "UNLOCK TABLES";
async function endRoute(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // check input
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    await conn.query(lockTableSql);
    if ((await global.existUserTran(conn, userId)) === true) {
      await global.executeEnd(conn, userId);
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

export default express.Router().post("/endRoute", async (req, res) => {
  try {
    res.json(await endRoute(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
