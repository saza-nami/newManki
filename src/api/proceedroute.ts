/** 停留所に停まっている車を次の停留所へ進ませる */

import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

/** sql */
const reqUserIds =
  "SELECT carId, orderId FROM userTable \
  WHERE userId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
const reqOrderFlags =
  "SELECT finish, arrival FROM orderTable WHERE orderId = ? FOR UPDATE";
const reqCarStatus = "SELECT status FROM carTable WHERE carId = ? FOR UPDATE";
const updArrival = "UPDATE orderTable SET arrival = 0 WHERE orderId = ?";
const updCarStatus = "UPDATE carTable SET status = 3 WHERE carId = ?";

/** API から呼び出される関数 */
async function proceedRoute(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const proceed = db.extractElem(
        await db.executeTran(conn, reqUserIds, [userId])
      );
      if (
        proceed !== undefined &&
        "carId" in proceed &&
        proceed["carId"] !== undefined &&
        "orderId" in proceed &&
        proceed["orderId"] !== undefined
      ) {
        const order = db.extractElem(
          await db.executeTran(conn, reqOrderFlags, [proceed["orderId"]])
        );
        const status = db.extractElem(
          await db.executeTran(conn, reqCarStatus, [proceed["carId"]])
        );
        if (
          order !== undefined &&
          status !== undefined &&
          "finish" in order &&
          order["finish"] === 0 &&
          "arrival" in order &&
          order["arrival"] === 1 &&
          "status" in status &&
          status["status"] === 4
        ) {
          await db.executeTran(conn, updArrival, [proceed["orderId"]]);
          await db.executeTran(conn, updCarStatus, [proceed["carId"]]);
          result.succeeded = true;
        } else {
          result.reason = "The car you are using is not at the stop.";
        }
      }
    } else {
      result.reason = "Illegal user.";
    }
    await conn.commit();
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

/** proceedRoute API の実体 */
export default express.Router().post("/proceedRoute", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await proceedRoute(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
