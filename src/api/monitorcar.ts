// 車を見る画面で呼ばれるAPI

import express from "express";
import { ApiResult, Position } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

interface MonitorCar extends ApiResult {
  route?: Position[][];
  dest?: Position[];
  arrival?: boolean;
  finish?: boolean;
  status?: number;
  nowPoint?: Position;
  battery?: number;
}

// arrival true を確認する
const reqOrderStatusSql =
  "SELECT route, dest, arrival, finish FROM orderTable WHERE orderId = \
  (SELECT orderId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL) \
    LOCK IN SHARE MODE";
const reqCarStatusSql =
  "SELECT status, nowPoint, battery FROM carTable WHERE carId = \
  (SELECT carId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL) \
    LOCK IN SHARE MODE";

async function monitorCar(userId: string): Promise<MonitorCar> {
  // return value of API
  const result: MonitorCar = { succeeded: false };
  // check input
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const orderStatus = db.extractElem(
        await db.executeTran(conn, reqOrderStatusSql, [userId])
      );
      const carStatus = db.extractElem(
        await db.executeTran(conn, reqCarStatusSql, [userId])
      );
      if (orderStatus !== undefined) {
        if (carStatus !== undefined) {
          if (
            "route" in orderStatus &&
            "dest" in orderStatus &&
            "arrival" in orderStatus &&
            "finish" in orderStatus &&
            "status" in carStatus &&
            "nowPoint" in carStatus &&
            "battery" in carStatus
          ) {
            result.succeeded = true;
            result.route = orderStatus["route"];
            result.dest = orderStatus["dest"];
            result.arrival = orderStatus["arrival"] ? true : false;
            result.finish = orderStatus["finish"] ? true : false;
            result.status = carStatus["status"];
            result.nowPoint = carStatus["nowPoint"];
            result.battery = carStatus["battery"];
          }
        } else {
          if (
            "route" in orderStatus &&
            "dest" in orderStatus &&
            "arrival" in orderStatus &&
            "finish" in orderStatus
          ) {
            result.succeeded = true;
            result.route = orderStatus["route"];
            result.dest = orderStatus["dest"];
            result.arrival = orderStatus["arrival"] ? true : false;
            result.finish = orderStatus["finish"] ? true : false;
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

export default express.Router().post("/monitorCar", async (req, res) => {
  try {
    res.json(await monitorCar(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
