// 車を見る画面で呼ばれるAPI

import express from "express";
import { ApiResult, Position } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

interface MonitorCar extends ApiResult {
  route?: Position[][];
  dest?: Position[];
  arrival?: boolean;
  finish?: boolean;
  arrange?: boolean;
  status?: boolean;
  nowPoint?: Position;
  battery?: number;
  reserve?: boolean;
  // 車が経路のどこまで進んだか出して
}

// arrival true を確認する
const reqOrderStatusSql =
  "SELECT route, dest, arrival, finish, arrange FROM orderTable \
  WHERE orderId = (SELECT orderId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL LOCK IN SHARE MODE) \
    LOCK IN SHARE MODE";
const reqCarStatusSql =
  "SELECT status, nowPoint, battery FROM carTable WHERE carId = \
  (SELECT carId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL LOCK IN SHARE MODE) \
    LOCK IN SHARE MODE";

async function monitorCar(userId: string): Promise<MonitorCar> {
  // return value of API
  const result: MonitorCar = { succeeded: false };
  // check input
  if (typeof userId === "undefined") {
    return report(result);
  }
  const rnd = Math.random() * 100;
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
            result.route = orderStatus["route"];
            result.dest = orderStatus["dest"];
            result.arrival = orderStatus["arrival"] ? true : false;
            result.arrange = orderStatus["arrange"] ? true : false;
            result.finish = orderStatus["finish"] ? true : false;
            result.status =
              carStatus["status"] == 5 || carStatus["status"] == 6
                ? false
                : true;
            result.nowPoint = carStatus["nowPoint"];
            // result.battery = carStatus["battery"];
            result.battery = rnd; // FOR DEBUG
            result.reserve = true;
          }
        } else {
          if (
            "route" in orderStatus &&
            "dest" in orderStatus &&
            "arrival" in orderStatus &&
            "finish" in orderStatus &&
            "arrange" in orderStatus
          ) {
            result.route = orderStatus["route"];
            result.dest = orderStatus["dest"];
            result.arrival = orderStatus["arrival"] ? true : false;
            result.finish = orderStatus["finish"] ? true : false;
            result.arrange = orderStatus["arrange"] ? true : false;
            result.reserve = false;
          }
        }
      }
      result.succeeded = true;
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
