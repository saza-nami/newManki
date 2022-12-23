// 終わり画面で呼ばれるAPI (サービス利用終了)

import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

async function terminate(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const lockUWOWCW =
    "LOCK TABLES userTable WRITE, orderTable WRITE, carTable WRITE";
  const unlock = "UNLOCK TABLES";
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockUWOWCW);
    if ((await global.existUserTran(conn, userId)) === true) {
      await global.executeEnd(conn, userId);
      await global.executeTerminate(conn, userId);
      result.succeeded = true;
    } else {
      result.reason = "Illegal user.";
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlock);
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/terminate", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await terminate(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
