/** ユーザに紐付けられている経路の実行をキャンセルする */

import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

/** sql */
const lockOWCW = "LOCK TABLES orderTable WRITE, carTable WRITE, userTable READ";
const unlock = "UNLOCK TABLES";

/** API から呼び出される関数 */
async function endRoute(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockOWCW);
    if ((await global.existUserTran(conn, userId)) === true) {
      await global.executeEnd(conn, userId);
      result.succeeded = true;
    } else {
      result.reason = "Illegal user.";
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

/** endRoute API の実体 */
export default express.Router().post("/endRoute", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await endRoute(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
