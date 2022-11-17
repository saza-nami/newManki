// 車を見る画面で呼ばれるAPI

import express from "express";
import { ApiResult, Position } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

interface MonitorCar extends ApiResult {
  route?: Position[][];
  dest?: Position[];
  nowPoint?: Position;
  battery?: number;
}

// arrival true を確認する

const reqIdsSql =
  "SELECT carId, orderId FROM userTable WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL";
const carInfoSql = "CALL carInfoProc(?, ?, @a, @b, @c, @d, @e, @f, @g)";

async function monitorCar(userId: string): Promise<MonitorCar> {
  const result: MonitorCar = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  const ids = await db.execute(reqIdsSql, [userId]);
  let carId = "";
  let orderId = "";
  if (Array.isArray(ids) && Array.isArray(ids[0])) {
    if (typeof ids[0][0] !== "undefined") {
      if (
        "carId" in ids[0][0] &&
        ids[0][0]["carId"] !== undefined &&
        "orderId" in ids[0][0] &&
        ids[0][0]["orderId"] !== undefined
      ) {
        carId = ids[0][0]["carId"];
        orderId = ids[0][0]["orderId"];
      }
    }
  }

  const rows = await db.execute(carInfoSql, [carId, orderId]);

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

export default express.Router().post("/monitorCar", async (req, res) => {
  try {
    res.json(await monitorCar(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
