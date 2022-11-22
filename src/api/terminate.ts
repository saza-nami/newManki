// 終わり画面で呼ばれるAPI (サービス利用終了)

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

async function terminate(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      await global.executeEnd(conn, userId);
      await global.executeTerminate(conn, userId);
      result.succeeded = true;
    }
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/terminate", async (req, res) => {
  try {
    res.json(await terminate(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
