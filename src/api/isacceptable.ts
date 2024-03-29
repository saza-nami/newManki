/** 新しい経路を実行可能か調べる (Manki-ui では利用されていない) */

import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

/** sql */
const reqUserIds =
  "SELECT carId, orderId FROM userTable \
  WHERE userId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
const reqUserEndAt =
  "SELECT endAt FROM orderTable WHERE orderId = ? LOCK IN SHARE MODE";
const reqCarStatus =
  "SELECT status FROM carTable \
  WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";

/** API から呼び出される関数 */
async function isAcceptable(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const isOrder = db.extractElem(
        await db.executeTran(conn, reqUserIds, [userId])
      );
      if (isOrder !== undefined && "orderId" in isOrder) {
        if (isOrder["orderId"] === null) {
          result.succeeded = true;
        } else {
          if ("carId" in isOrder && isOrder["carId"] !== undefined) {
            const isEndOrder = db.extractElem(
              await db.executeTran(conn, reqUserEndAt, [isOrder["orderId"]])
            );
            if (isEndOrder !== undefined && "endAt" in isEndOrder) {
              if (isEndOrder["endAt"] !== null) {
                const carStatus = db.extractElem(
                  await db.executeTran(conn, reqCarStatus, [isOrder["carId"]])
                );
                if (
                  carStatus !== undefined &&
                  "status" in carStatus &&
                  carStatus["status"] === 2
                ) {
                  result.succeeded = true;
                } else if (
                  carStatus !== undefined &&
                  "status" in carStatus &&
                  (carStatus["status"] === 5 || carStatus["status"] === 6)
                ) {
                  result.reason =
                    "A problem has occurred with the car being used. \
                    Please contact the administrator.";
                } else {
                  result.reason =
                    "There is a problem with the system status. \
                    Please contact the administrator.";
                }
              } else {
                result.reason =
                  "A new route cannot be created \
                  because the instruction is being executed.";
              }
            }
          } else {
            result.reason =
              "A new route cannot be created \
              because a car assignment is in progress.";
          }
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

/** isAcceptable API の実体 */
export default express.Router().post("/isAcceptable", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await isAcceptable(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
