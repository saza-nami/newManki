/** 対車両通信を行う */
import express from "express";
import mysql from "mysql2/promise";
import { ApiResult, Access, Position, Proceed } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

/** API の返り値 */
interface ReplyInfo extends ApiResult {
  response?: string;
  destination?: Position;
  sequence?: number;
}

/** dos 攻撃対策用変数 */
let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };

/** response 内容決定用変数 */
let carStatus: number = 1;

/** createReply sql */
const lockCW = "LOCK TABLES orderTable WRITE, carTable WRITE, userTable READ";
const unlock = "UNLOCK TABLES";
const addCar =
  "INSERT INTO carTable (sequence, nowPoint, battery) \
  VALUES (?, ?, ?)";
const reqLastCarId =
  "SELECT BIN_TO_UUID(carId, 1) FROM carTable \
  ORDER BY carId DESC, lastAt DESC LIMIT 1 LOCK IN SHARE MODE";
const reqCarInfo =
  "SELECT status, nowPoint FROM carTable \
  WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
const updCarInfo =
  "UPDATE carTable SET sequence = ?, nowPoint = ?, battery = ?, \
  lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)";
const haltCar =
  "UPDATE carTable SET status = 5, sequence = ?, nowPoint = ?, battery = ?, \
  lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)";

/** progressTran sql */
const getOrderId =
  "SELECT orderId FROM userTable \
    WHERE carId = UUID_TO_BIN(?, 1) AND endAt IS NULL LOCK IN SHARE MODE";
const getParams =
  "SELECT nextPoint, arrival, finish, arrange, carToRoute, route, \
    junkai, pRoute, pPoint FROM orderTable WHERE orderId = ? \
    FOR UPDATE";
const arrangeOrder =
  "UPDATE orderTable SET arrival = TRUE, arrange = TRUE, \
    pRoute = 1, pPoint = 0, nextPoint = ? WHERE orderId = ?";
const arrangeCar =
  "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)";
const initArr = "UPDATE orderTable SET nextPoint = ? WHERE orderId = ?";
const notArrOrder =
  "UPDATE orderTable SET nextPoint = ?, \
    pPoint = pPoint + 1 WHERE orderId = ?";
const junkaiOrder =
  "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, \
    pRoute = 1, pPoint = 0 WHERE orderId = ?";
const finishOrder =
  "UPDATE orderTable SET nextPoint = null, arrival = TRUE, \
    finish = TRUE, endAt = NOW(), pPoint = pPoint + 1 WHERE orderId = ?";
const finishCar =
  "UPDATE carTable SET status = 2 WHERE carId = UUID_TO_BIN(?, 1)";
const arrivalOrder =
  "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, \
    pRoute = pRoute + 1, pPoint = 0 WHERE orderId = ?";
const arrivalCar =
  "UPDATE carTable SET status = 4 \
    WHERE carId = UUID_TO_BIN(?, 1)";
const moving =
  "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 \
    WHERE orderId = ?";

/** API から呼び出される関数 */
async function createReply(
  request: string,
  location: Position,
  battery: number,
  carId?: string,
  sequence?: number
): Promise<ReplyInfo> {
  const result: ReplyInfo = { succeeded: false };
  const rndSeq = (Math.random() * 2147483646 + 1) | 0;
  console.log(rndSeq);
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockCW);
    if (request === "hello") {
      if (location !== undefined && battery !== undefined) {
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
              if (carInfo["status"] === 5 || carInfo["status"] === 6) {
                result.response = "halt";
              } else {
                console.log(
                  await db.executeTran(conn, updCarInfo, [
                    rndSeq,
                    location,
                    battery,
                    carId,
                  ])
                );
                result.sequence = rndSeq;
                if (
                  carInfo["status"] === 1 ||
                  carInfo["status"] === 2 ||
                  carInfo["status"] === 4
                ) {
                  result.response = "stop";
                }
                if (carInfo["status"] === 3) {
                  result.response = "next";
                  const nextPoint = await progressTran(conn, carId);
                  if (nextPoint !== null) {
                    result.destination = nextPoint;
                  } else {
                    result.response = "stop";
                  }
                }
              }
            } else if (request === "ping") {
              result.succeeded = true;
              if (carInfo["status"] === 5 || carInfo["status"] === 6) {
                result.response = "halt";
              } else {
                await db.executeTran(conn, updCarInfo, [
                  rndSeq,
                  location,
                  battery,
                  carId,
                ]);
                result.sequence = rndSeq;
                if (carInfo["status"] === 3 || carInfo["status"] === 4) {
                  if (carStatus === carInfo["status"]) {
                    result.response = "pong";
                  } else if (carInfo["status"] === 3) {
                    result.response = "next";
                  } else if (carInfo["status"] === 4) {
                    result.response = "stop";
                  }
                } else if (carInfo["status"] === 1 || carInfo["status"] === 2) {
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
              result.reason = "The request cannot be executed.";
            }
            carStatus = carInfo["status"];
          }
        } else {
          result.reason = "auth error.";
        }
      }
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

/** ルート進行関数 */
async function progressTran(
  connected: mysql.PoolConnection,
  carId: string
): Promise<Position | null> {
  let nextPosition: Position | null = null;

  const userTable = db.extractElem(
    await db.executeTran(connected, getOrderId, [carId])
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
    await db.executeTran(connected, getParams, [orderId])
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
    if (!param.arrival && !param.finish) {
      if (!param.arrange) {
        /**手配経路走行中 */
        if (
          param.pPoint === 0 &&
          param.nextPoint.lat === param.carToRoute[param.pPoint].lat &&
          param.nextPoint.lng === param.carToRoute[param.pPoint].lng
        ) {
          /**初回処理 */
          if (
            param.carToRoute.length === 2 &&
            param.carToRoute[0].lat === param.carToRoute[1].lat &&
            param.carToRoute[0].lng === param.carToRoute[1].lng
          ) {
            /**手配経路到着処理 */
            await db.executeTran(connected, arrangeOrder, [
              param.route[0][0],
              orderId,
            ]);
            await db.executeTran(connected, arrangeCar, [carId]);
            nextPosition = null;
          } else {
            await db.executeTran(connected, initArr, [
              param.carToRoute[1],
              orderId,
            ]);
            nextPosition = param.carToRoute[param.pPoint + 1];
          }
        } else if (param.pPoint + 2 === param.carToRoute.length) {
          /**手配経路到着処理 */
          await db.executeTran(connected, arrangeOrder, [
            param.route[0][0],
            orderId,
          ]);
          await db.executeTran(connected, arrangeCar, [carId]);
          nextPosition = null;
        } else {
          /**進行処理 */
          await db.executeTran(connected, notArrOrder, [
            param.carToRoute[param.pPoint + 2],
            orderId,
          ]);
          nextPosition = param.carToRoute[param.pPoint + 2];
        }
      } else {
        /**経路走行中 */
        if (
          param.pPoint === 0 &&
          param.nextPoint.lat ===
            param.route[param.pRoute - 1][param.pPoint].lat &&
          param.nextPoint.lng ===
            param.route[param.pRoute - 1][param.pPoint].lng
        ) {
          if (
            param.route[param.pRoute - 1].length === 2 &&
            param.route[param.pRoute - 1][0].lat ===
              param.route[param.pRoute - 1][1].lat &&
            param.route[param.pRoute - 1][0].lng ===
              param.route[param.pRoute - 1][1].lng
          ) {
            if (
              param.pRoute === param.route.length &&
              param.pPoint + 2 === param.route[param.pRoute - 1].length
            ) {
              /**目的地到着処理 */
              if (param.junkai) {
                /**巡回する場合 */
                await db.executeTran(connected, junkaiOrder, [
                  param.route[0][0],
                  orderId,
                ]);
                await db.executeTran(connected, arrivalCar, [carId]);
                nextPosition = null;
              } else {
                /**巡回しない場合 */
                await db.executeTran(connected, finishOrder, [orderId]);
                await db.executeTran(connected, finishCar, [carId]);
                nextPosition = null;
              }
            } else if (
              param.pPoint + 2 ===
              param.route[param.pRoute - 1].length
            ) {
              /**停留所到着処理 */
              await db.executeTran(connected, arrivalOrder, [
                param.route[param.pRoute][0],
                orderId,
              ]);
              await db.executeTran(connected, arrivalCar, [carId]);
              nextPosition = null;
            }
          } else {
            /**初回処理 */
            await db.executeTran(connected, initArr, [
              param.route[param.pRoute - 1][param.pPoint + 1],
              orderId,
            ]);
            nextPosition = param.route[param.pRoute - 1][param.pPoint + 1];
          }
        } else if (
          param.pRoute === param.route.length &&
          param.pPoint + 2 === param.route[param.pRoute - 1].length
        ) {
          /**目的地到着処理 */
          if (param.junkai) {
            /**巡回する場合 */
            await db.executeTran(connected, junkaiOrder, [
              param.route[0][0],
              orderId,
            ]);
            await db.executeTran(connected, arrivalCar, [carId]);
            nextPosition = null;
          } else {
            /**巡回しない場合 */
            await db.executeTran(connected, finishOrder, [orderId]);
            await db.executeTran(connected, finishCar, [carId]);
            nextPosition = null;
          }
        } else if (param.pPoint + 2 === param.route[param.pRoute - 1].length) {
          /**停留所到着処理 */
          await db.executeTran(connected, arrivalOrder, [
            param.route[param.pRoute][0],
            orderId,
          ]);
          await db.executeTran(connected, arrivalCar, [carId]);
          nextPosition = null;
        } else {
          /**進行処理 */
          await db.executeTran(connected, moving, [
            param.route[param.pRoute - 1][param.pPoint + 2],
            orderId,
          ]);
          nextPosition = param.route[param.pRoute - 1][param.pPoint + 2];
        }
      }
    }
  }
  return nextPosition;
}

/** sendCarInfo API の実体 */
export default express.Router().post("/sendCarInfo", async (req, res) => {
  try {
    if (req.body.request === "hello") {
      if (lastLog.ipAddress.indexOf(req.ip) > -1) {
        if (
          Date.now() - lastLog.date[lastLog.ipAddress.indexOf(req.ip)] <
          10000
        ) {
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
          return res.json({
            succeeded: false,
            reason: "Please allow some time and access again.",
          });
        } else {
          lastLog.date[lastLog.ipAddress.indexOf(req.ip)] = Date.now();
        }
      } else {
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
