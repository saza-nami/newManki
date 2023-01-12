// 対車両通信 API
import express from "express";
import mysql from "mysql2/promise";
import { ApiResult, Access, Position, Proceed } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

interface ReplyInfo extends ApiResult {
  response?: string;
  destination?: Position;
  sequence?: number;
}

let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };
let carStatus: number = 1;
const lockCW = "LOCK TABLES carTable WRITE";
const unlock = "UNLOCK TABLES";
const addCar =
  "INSERT INTO carTable (sequence, nowPoint, battery) \
  VALUES (?, ?, ?)";
const reqLastCarId =
  "SELECT BIN_TO_UUID(carId, 1) FROM carTable \
  ORDER BY carId DESC, lastAt DESC LIMIT 1 LOCK IN SHARE MODE";
const reqOrderId =
  "SELECT orderId FROM userTable \
  WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
const reqNext =
  "SELECE nextPoint FROM orderTable WHERE orderId = ? LOCK IN SHARE MODE";
const reqCarInfo =
  "SELECT status, nowPoint FROM carTable \
  WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
const updCarInfo =
  "UPDATE carTable SET sequence = ?, nowPoint = ?, battery = ?, \
  lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)";
const haltCar =
  "UPDATE carTable SET status = 5, sequence = ?, nowPoint = ?, battery = ?, \
  lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)";

async function createReply(
  request: string,
  location: Position,
  battery: number,
  carId?: string,
  sequence?: number
): Promise<ReplyInfo> {
  const result: ReplyInfo = { succeeded: false };
  const rndSeq = Math.trunc(Math.random() * 4294967294) + 1; // FIXME

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if (request === "hello") {
      if (location !== undefined && battery !== undefined) {
        await conn.query(lockCW);
        await db.executeTran(conn, addCar, [rndSeq, location, battery]);
        const carInfo = db.extractElem(
          await db.executeTran(conn, reqLastCarId)
        );
        if (
          carInfo !== undefined &&
          "BIN_TO_UUID(carId, 1)" in carInfo &&
          carInfo["BIN_TO_UUID(carId, 1)"] !== undefined
        ) {
          result.succeeded = true;
          result.response = carInfo["BIN_TO_UUID(carId, 1)"];
          result.sequence = rndSeq;
        }
      }
    } else {
      if (typeof carId !== "undefined" && typeof sequence !== "undefined") {
        if (
          (await global.existCarTran(conn, carId)) &&
          (await global.authSequenceTran(conn, carId, sequence))
        ) {
          /* 車が実行中の命令を取得 */
          const orderId = db.extractElem(
            await db.executeTran(conn, reqOrderId, [carId])
          );
          /* 車の状態(carTable.status)の確認を行う */
          const carInfo = db.extractElem(
            await db.executeTran(conn, reqCarInfo, [carId])
          );
          if (
            carInfo !== undefined &&
            "status" in carInfo &&
            carInfo["status"] !== undefined
          ) {
            if (request === "next") {
              result.succeeded = true;
              if (
                carInfo["status"] === 5 ||
                carInfo["status"] === 6 ||
                carInfo["status"] === 7
              ) {
                result.response = "halt";
              } else {
                await db.executeTran(conn, updCarInfo, [
                  rndSeq,
                  location,
                  battery,
                  carId,
                ]);
                result.sequence = rndSeq;
                if (
                  carInfo["status"] === 1 ||
                  carInfo["status"] === 2 ||
                  carInfo["status"] === 4
                ) {
                  result.response = "stop";
                  if (
                    orderId !== undefined &&
                    "orderId" in orderId &&
                    orderId["orderId"] !== undefined
                  ) {
                    const destination = db.extractElem(
                      await db.executeTran(conn, reqNext, [orderId["orderId"]])
                    );
                    if (
                      destination !== undefined &&
                      "nextPoint" in destination &&
                      destination["nextPoint"] !== undefined
                    ) {
                      result.destination = destination["nextPoint"];
                    }
                  }
                }
                if (carInfo["status"] === 3) {
                  result.response = "next";
                  const nextPoint = await progressTran(
                    conn,
                    carId,
                    carInfo["status"]
                  );
                  console.log(nextPoint);
                  if (nextPoint !== undefined) {
                    result.destination = nextPoint;
                  } else {
                    result.response = "stop";
                  }
                }
              }
            } else if (request === "ping") {
              result.succeeded = true;
              if (
                carInfo["status"] === 5 ||
                carInfo["status"] === 6 ||
                carInfo["status"] === 7
              ) {
                result.response = "halt";
              } else {
                await db.executeTran(conn, updCarInfo, [
                  rndSeq,
                  location,
                  battery,
                  carId,
                ]);
                result.sequence = rndSeq;
                if (
                  orderId !== undefined &&
                  "orderId" in orderId &&
                  orderId["orderId"] !== undefined
                ) {
                  const destination = db.extractElem(
                    await db.executeTran(conn, reqNext, [orderId["orderId"]])
                  );
                  console.log("dest " + destination);
                  if (
                    destination !== undefined &&
                    "nextPoint" in destination &&
                    destination["nextPoint"] !== undefined
                  ) {
                    result.destination = destination["nextPoint"];
                  }
                }
                if (carInfo["status"] === 3 || carInfo["status"] === 4) {
                  if (carStatus === carInfo["status"]) {
                    result.response = "pong";
                  } else if (carInfo["status"] === 3) {
                    result.response = "next";
                  } else if (carInfo["status"] === 4) {
                    result.response = "stop";
                  }
                } else if (
                  carInfo["status"] === 1 &&
                  "nowPoint" in carInfo &&
                  carInfo["nowPoint"] !== undefined
                ) {
                  result.response = "stop";
                  result.destination = carInfo["nowPoint"];
                } else if (carInfo["status"] === 2) {
                  result.response = "stop";
                }
              }
            } else if (request === "halt") {
              await db.executeTran(conn, haltCar, [
                rndSeq,
                location,
                battery,
                carId,
              ]);
              result.succeeded = true;
              result.response = "halt";
            } else {
              result.reason = "request error";
            }
            carStatus = carInfo["status"];
          }
        } else {
          result.reason = "auth error";
          console.log("auth error");
        }
      }
    }
    await conn.commit();
    await conn.query(unlock);
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

// Advance car
async function progressTran(
  connected: mysql.PoolConnection,
  carId: string,
  status: number
): Promise<Position | undefined> {
  let nextPosition: Position | undefined = undefined;
  // carId から車を進ませるのに必要な情報を取得
  const getOrderIdSql =
    "SELECT orderId FROM userTable \
    WHERE carId = UUID_TO_BIN(?, 1) AND endAt IS NULL FOR UPDATE";
  const getParamsSql =
    "SELECT nextPoint, arrival, finish, arrange, carToRoute, route, \
    junkai, pRoute, pPoint FROM orderTable WHERE orderId = ? \
    FOR UPDATE";
  const arrangeOrderSql =
    "UPDATE orderTable SET arrival = TRUE, arrange = TRUE, \
    pRoute = 1, pPoint = 0, nextPoint = ? WHERE orderId = ?";
  const arrangeCarSql =
    "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)";
  const notArrOrderSql =
    "UPDATE orderTable SET nextPoint = ?, \
    pPoint = pPoint + 1 WHERE orderId = ?";
  const junkaiOrderSql =
    "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, \
    pRoute = 1, pPoint = 0 WHERE orderId = ?";
  const finishOrderSql =
    "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, \
    finish = TRUE, endAt = NOW() WHERE orderId = ?";
  const finishCarSql =
    "UPDATE carTable SET status = 2 WHERE carId = UUID_TO_BIN(?, 1)";
  const arrivalOrderSql =
    "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, \
    pRoute = pRoute + 1, pPoint = 0 WHERE orderId = ?";
  const arrivalCarSql =
    "UPDATE carTable SET status = 4 \
    WHERE carId = UUID_TO_BIN(?, 1)";
  const movingSql =
    "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 \
    WHERE orderId = ?";

  const userTable = db.extractElem(
    await db.executeTran(connected, getOrderIdSql, [carId])
  );
  let orderId: number = 0;
  if (
    userTable !== undefined &&
    "orderId" in userTable &&
    userTable["orderId"] !== undefined
  ) {
    orderId = userTable["orderId"];
  } else {
    return nextPosition;
  }

  const orderTable = db.extractElem(
    await db.executeTran(connected, getParamsSql, [orderId])
  );
  let param: Proceed;
  if (
    orderTable !== undefined &&
    "nextPoint" in orderTable &&
    orderTable["nextPoint"] !== undefined &&
    "arrival" in orderTable &&
    orderTable["arrival"] !== undefined &&
    "finish" in orderTable &&
    orderTable["finish"] !== undefined &&
    "arrange" in orderTable &&
    orderTable["arrange"] !== undefined &&
    "carToRoute" in orderTable &&
    orderTable["carToRoute"] !== undefined &&
    "route" in orderTable &&
    orderTable["route"] !== undefined &&
    "junkai" in orderTable &&
    orderTable["junkai"] !== undefined &&
    "pRoute" in orderTable &&
    orderTable["pRoute"] !== undefined &&
    "pPoint" in orderTable &&
    orderTable["pPoint"] !== undefined
  ) {
    param = {
      nextPoint: orderTable["nextPoint"],
      arrival: orderTable["arrival"] ? true : false,
      finish: orderTable["finish"] ? true : false,
      arrange: orderTable["arrange"] ? true : false,
      carToRoute: orderTable["carToRoute"],
      route: orderTable["route"],
      junkai: orderTable["junkai"] ? true : false,
      pRoute: orderTable["pRoute"],
      pPoint: orderTable["pPoint"],
    };
    console.log(param);
    // 車が走行中で停留所に目的地にもいない場合
    if (status === 3 && !param.arrival && !param.finish) {
      // 車が経路の始点に向かっている時
      if (!param.arrange) {
        // 車が経路の始点についたら
        if (param.carToRoute.length - 1 === param.pPoint) {
          await db.executeTran(connected, arrangeOrderSql, [
            param.route[0][1],
            orderId,
          ]);
          await db.executeTran(connected, arrangeCarSql, [carId]);
        }
        // 車が経路の始点まで移動中なら
        else if (param.carToRoute.length - 1 > param.pPoint) {
          console.log("go to arrange position");
          await db.executeTran(connected, notArrOrderSql, [
            param.carToRoute[param.pPoint + 1],
            orderId,
          ]);
        }
      }
      // 車が経路の始点についた後
      else {
        // 目的地についたら
        if (
          param.route.length === param.pRoute &&
          param.route[param.pRoute - 1].length - 2 === param.pPoint
        ) {
          // 巡回する場合
          if (param.junkai) {
            await db.executeTran(connected, junkaiOrderSql, [
              param.route[0][1],
              orderId,
            ]);
          }
          // 巡回しない場合
          else {
            await db.executeTran(connected, finishOrderSql, [orderId]);
            await db.executeTran(connected, finishCarSql, [carId]);
          }
        }
        // 停留所についたら
        else if (param.route[param.pRoute - 1].length - 2 === param.pPoint) {
          await db.executeTran(connected, arrivalOrderSql, [
            param.route[param.pRoute][0],
            orderId,
          ]);
          await db.executeTran(connected, arrivalCarSql, [carId]);
        }
        // 経路間移動中なら
        else {
          await db.executeTran(connected, movingSql, [
            param.route[param.pRoute - 1][param.pPoint + 2],
            orderId,
          ]);
        }
      }
      nextPosition = param.nextPoint;
    }
  }
  return nextPosition;
}

export default express.Router().post("/sendCarInfo", async (req, res) => {
  try {
    // dos attack countermeasures
    if (req.body.request === "hello") {
      if (lastLog.ipAddress.indexOf(req.ip) > -1) {
        if (
          Date.now() - lastLog.date[lastLog.ipAddress.indexOf(req.ip)] <
          10000
        ) {
          // update attacker's log
          lastLog.date[lastLog.ipAddress.indexOf(req.ip)] = Date.now();
          let date = lastLog.date[lastLog.ipAddress.indexOf(req.ip)];
          let ip = lastLog.ipAddress[lastLog.ipAddress.indexOf(req.ip)];
          lastLog.date.splice(
            lastLog.ipAddress.indexOf(req.ip),
            lastLog.ipAddress.indexOf(req.ip)
          );
          lastLog.ipAddress.splice(
            lastLog.ipAddress.indexOf(req.ip),
            lastLog.ipAddress.indexOf(req.ip)
          );
          lastLog.date.unshift(date);
          lastLog.ipAddress.unshift(ip);
          return res.json({ succeeded: false });
        } else {
          lastLog.date[lastLog.ipAddress.indexOf(req.ip)] = Date.now();
        }
      } else {
        // add new user's log
        lastLog.date.push(Date.now());
        lastLog.ipAddress.push(req.ip);
      }
    }
    if (
      req.body.request === "hello" &&
      typeof req.body.location !== "undefined" &&
      typeof req.body.battery !== "undefined"
    ) {
      res.json(
        await createReply(req.body.request, req.body.location, req.body.battery)
      );
    } else if (
      typeof req.body.request !== "undefined" ||
      typeof req.body.location !== "undefined" ||
      typeof req.body.battery !== "undefined" ||
      typeof req.body.carId !== "undefined" ||
      typeof req.body.sequence !== "undefined"
    ) {
      res.json(
        await createReply(
          req.body.request,
          req.body.location,
          req.body.battery,
          req.body.carId,
          req.body.sequence
        )
      );
    } else {
      res.json({ succeeded: false, reason: "Invalid request." });
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
