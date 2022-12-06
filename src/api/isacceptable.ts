/* 状態遷移図でいうところの動作中チェックAPI */

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

const lockTableSql =
  "LOCK TABLES userTable READ, orderTable READ, carTable READ";
const unlockTableSql = "UNLOCK TABLES";
const userStatusSql =
  "SELECT carId, orderId FROM userTable \
  WHERE userId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
const completedOrderSql =
  "SELECT endAt FROM orderTable WHERE orderId = ? LOCK IN SHARE MODE";
const reqCarStatus =
  "SELECT status FROM carTable \
  WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";

async function isAcceptableTran(userId: string): Promise<ApiResult> {
  // return value of API
  const result: ApiResult = { succeeded: false };
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockTableSql);
    if ((await global.existUserTran(conn, userId)) === true) {
      const isOrder = db.extractElem(
        await db.executeTran(conn, userStatusSql, [userId])
      );
      if (isOrder !== undefined && "orderId" in isOrder) {
        if (isOrder["orderId"] === null) {
          result.succeeded = true;
        } else {
          if ("carId" in isOrder && isOrder["carId"] !== undefined) {
            const isEndOrder = db.extractElem(
              await db.executeTran(conn, completedOrderSql, [
                isOrder["orderId"],
              ])
            );
            if (isEndOrder !== undefined && "endAt" in isEndOrder) {
              if (isEndOrder["endAt"] !== null) {
                const carStatus = db.extractElem(
                  await db.executeTran(conn, reqCarStatus, [isOrder["carId"]])
                );
                if (
                  carStatus !== undefined &&
                  "status" in carStatus &&
                  carStatus["status"] == 2
                ) {
                  result.succeeded = true;
                }
              }
            }
          }
        }
      }
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

export default express.Router().post("/isAcceptable", async (req, res) => {
  try {
    res.json(await isAcceptableTran(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
