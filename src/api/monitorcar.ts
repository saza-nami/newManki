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
  junkai?: boolean;
  status?: boolean;
  nowPoint?: Position;
  battery?: number;
  reserve?: boolean;
}

// arrival true を確認する
const lockORCR = "LOCK TABLES userTable READ, orderTable READ, carTable READ";
const unlock = "UNLOCK TABLES";
const reqOrderStatusSql =
  "SELECT route, dest, arrival, finish, arrange, junkai FROM orderTable \
  WHERE orderId = (SELECT orderId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) AND endAt IS NULL LOCK IN SHARE MODE) \
    LOCK IN SHARE MODE";
const reqCarStatusSql =
  "SELECT status, nowPoint, battery FROM carTable WHERE carId = \
  (SELECT carId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) AND endAt IS NULL LOCK IN SHARE MODE) \
    LOCK IN SHARE MODE";

async function monitorCar(userId: string): Promise<MonitorCar> {
  const result: MonitorCar = { succeeded: false };
  const rnd = Math.random() * 100; // FOR DEBUG
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockORCR);
    if ((await global.existUserTran(conn, userId)) === true) {
      const orderStatus = db.extractElem(
        await db.executeTran(conn, reqOrderStatusSql, [userId])
      );
      const carStatus = db.extractElem(
        await db.executeTran(conn, reqCarStatusSql, [userId])
      );
      if (orderStatus !== undefined) {
        console.log(orderStatus);
        console.log(carStatus);
        if (carStatus !== undefined) {
          if (
            "route" in orderStatus &&
            orderStatus["route"] !== undefined &&
            "dest" in orderStatus &&
            orderStatus["dest"] !== undefined &&
            "arrival" in orderStatus &&
            orderStatus["arrival"] !== undefined &&
            "finish" in orderStatus &&
            orderStatus["finish"] !== undefined &&
            "arrange" in orderStatus &&
            orderStatus["arrange"] !== undefined &&
            "junkai" in orderStatus &&
            orderStatus["junkai"] !== undefined &&
            "status" in carStatus &&
            carStatus["status"] !== undefined &&
            "nowPoint" in carStatus &&
            carStatus["nowPoint"] !== undefined &&
            "battery" in carStatus &&
            carStatus["battery"] !== undefined
          ) {
            result.route = orderStatus["route"];
            result.dest = orderStatus["dest"];
            result.arrival = orderStatus["arrival"] ? true : false;
            result.finish = orderStatus["finish"] ? true : false;
            result.arrange = orderStatus["arrange"] ? true : false;
            result.junkai = orderStatus["junkai"] ? true : false;
            result.status =
              carStatus["status"] == 5 ||
              carStatus["status"] == 6 ||
              carStatus["status"] == 7
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
            orderStatus["route"] !== undefined &&
            "dest" in orderStatus &&
            orderStatus["dest"] !== undefined &&
            "arrival" in orderStatus &&
            orderStatus["arrival"] !== undefined &&
            "finish" in orderStatus &&
            orderStatus["finish"] !== undefined &&
            "arrange" in orderStatus &&
            orderStatus["arrange"] !== undefined &&
            "junkai" in orderStatus &&
            orderStatus["junkai"] !== undefined
          ) {
            result.route = orderStatus["route"];
            result.dest = orderStatus["dest"];
            result.arrival = orderStatus["arrival"] ? true : false;
            result.finish = orderStatus["finish"] ? true : false;
            result.arrange = orderStatus["arrange"] ? true : false;
            result.junkai = orderStatus["junkai"] ? true : false;
            result.reserve = false;
          }
        }
        result.succeeded = true;
      }
    } else {
      result.reason = "Illegal user.";
    }
    await conn.commit();
    await conn.query(unlock);
  } catch (err) {
    await conn.rollback();
    result.reason = err;
    if (err instanceof Error) {
      result.reason = err.message;
    }
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/monitorCar", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await monitorCar(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
