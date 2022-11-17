// 状態遷移図でいうところの動作中チェックAPI

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

const isAccceptableSql = "CALL isAcceptableProc(?, @a, @b)";

export async function isAccceptable(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  // 新しく経路を作成できるか
  const [rows, _] = await db.execute(isAccceptableSql, [userId]);
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    // orderId が null か
    if ("orderId" in rows[0][0] && rows[0][0]["orderId"] === null) {
      result.succeeded = true;
    } else {
      // carId から status:2 が得られるか
      if ("status" in rows[0][0] && rows[0][0]["status"] === 2) {
        result.succeeded = true;
      }
    }
  }
  return report(result);
}

export async function isAcceptableTran(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const isOrder = db.extractElem(
        await db.executeTran(
          conn,
          "SELECT carId orderId, endAt FROM userTable WHERE userId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE",
          [userId]
        )
      );
      if (isOrder !== undefined && "orderId" in isOrder && "endAt" in isOrder) {
        if (isOrder["orderId"] === null && isOrder["endAt"] == null) {
          result.succeeded = true;
        } else {
          if ("carId" in isOrder && isOrder["carId"] !== undefined) {
            const isEndOrder = db.extractElem(
              await db.executeTran(
                conn,
                "SELECT endAt FROM orderTable WEHRE orderId = ? LOCK IN SHARE MODE",
                [isOrder["orderId"]]
              )
            );
            if (isEndOrder !== undefined && "endAt" in isEndOrder) {
              if (isEndOrder["endAt"] === null) {
                const carStatus = db.extractElem(
                  await db.executeTran(
                    conn,
                    "SELECT status FROM carTable WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE",
                    [isOrder["carId"]]
                  )
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
