// 命令を終了するときに呼ばれるAPI

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

async function endRoute(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // check input
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      if ((await global.executeEnd(conn, userId)) === true) {
        result.succeeded = true;
      }
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

export default express.Router().post("/endRoute", async (req, res) => {
  try {
    res.json(await endRoute(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
