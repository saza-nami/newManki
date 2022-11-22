// 対車両通信 API
import express from "express";
import { ApiResult, Position, proceed, Access } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";
import * as tran from "./scripts/transaction";

interface ReplyInfo extends ApiResult {
  responce?: string;
  location?: Position;
  sequence?: number;
}

let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };

const helloSql = "";
const pingSql = "";
const haltSql = "";
// lock tables
const lockTablesSql = "LOCK TABLES carTable WRITE";
// unlock tables
const unlockTablesSql = "UNLOCK TABLES";
const insertCarSql =
  "INSERT INTO carTable (sequence, nowPoint, battery) \
  VALUES (?, ?, ?)";
const reqLastCarIdSql =
  "SELECT BIN_TO_UUID(carId, 1) FROM carTable \
  ORDER BY carId DESC, lastAt DESC LIMIT 1";

async function createReply(
  carId: string,
  request: string,
  location: Position,
  sequence: number,
  battery: number
): Promise<ReplyInfo> {
  const result: ReplyInfo = { succeeded: false };
  const rndSeq = Math.trunc(Math.random() * 4294967294) + 1; // FIXME

  if (typeof request === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    await conn.query(lockTablesSql);
    if (request === "hello") {
      await db.executeTran(conn, insertCarSql);
      const carInfo = db.extractElem(
        await db.executeTran(conn, reqLastCarIdSql)
      );
      if (carInfo !== undefined && "carId" in carInfo) {
        result.succeeded = true;
        result.responce = carInfo["carId"];
        result.sequence = rndSeq;
      }
      console.log(rndSeq);
    } else {
      if (typeof carId !== "undefined") {
        if (
          (await global.existCarTran(conn, carId)) &&
          (await global.authSequenceTran(conn, carId, sequence))
        ) {
          if (request === "next") {
            /* 状態の確認を行う */
            result.location = await tran.progressTran(conn, carId);
            result.succeeded = true;
          } else if (request === "ping") {
            /* 状態の確認を行う */
            await db.executeTran(
              conn,
              "UPDATE carTable SET sequence = ?, nowPoint = ?, battery = ?, lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)",
              [rndSeq, location, battery, carId]
            );
          } else if (request === "halt") {
            await db.executeTran(
              conn,
              "UPDATE carTable SET status = 5, sequence = ?, nowPoint = ?, battery = ?, lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)",
              [rndSeq, location, battery, carId]
            );
          }
          result.sequence = rndSeq;
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlockTablesSql);
    conn.release();
  }
  return report(result);
}

// progressTran に変更
async function progressRoute(carId: string): Promise<Position | undefined> {
  const nextPostion: Position | undefined = undefined;
  // carId から車を進ませるのに必要な情報を取得
  const getOrderIdSql =
    "SELECT orderId FROM userTable WHERE carId = UUID_TO_BIN(?, 1) AND endAt IS NULL";
  const userTable = await db.execute(getOrderIdSql, [carId]);
  let orderId: number = 0;
  if (Array.isArray(userTable) && Array.isArray(userTable[0])) {
    if ("orderId" in userTable[0][0]) {
      orderId = userTable[0][0]["orderId"];
    } else {
      return nextPostion;
    }
  }
  const getStatusSql =
    "SELECT status FROM carTable WHERE carId = UUID_TO_BIN(?, 1)";
  const carTable = await db.execute(getStatusSql, [carId]);
  let status: number = 0;
  if (Array.isArray(carTable) && Array.isArray(carTable[0])) {
    if ("status" in carTable[0][0]) {
      status = carTable[0][0]["status"];
    } else {
      return nextPostion;
    }
  }

  const getParamsSql =
    "SELECT nextPoint, arrival, finish, arrange, carToRoute, route, junkai, pRoute, pPoint FROM orderTable WHERE orderId = ?";
  const orderTable = await db.execute(getParamsSql, [orderId]);
  let param: proceed;
  if (Array.isArray(orderTable) && Array.isArray(orderTable[0])) {
    if (
      "nextPoint" in orderTable[0][0] &&
      "arrival" in orderTable[0][0] &&
      "finish" in orderTable[0][0] &&
      "arrange" in orderTable[0][0] &&
      "carToRoute" in orderTable[0][0] &&
      "route" in orderTable[0][0] &&
      "junkai" in orderTable[0][0] &&
      "pRoute" in orderTable[0][0] &&
      "pPoint" in orderTable[0][0]
    ) {
      param = {
        nextPoint: orderTable[0][0]["nextPoint"],
        arrival: orderTable[0][0]["arrival"] ? true : false,
        finish: orderTable[0][0]["finish"] ? true : false,
        arrange: orderTable[0][0]["arrange"] ? true : false,
        carToRoute: orderTable[0][0]["carToRoute"],
        route: orderTable[0][0]["route"],
        junkai: orderTable[0][0]["junkai"] ? true : false,
        pRoute: orderTable[0][0]["pRoute"],
        pPoint: orderTable[0][0]["pPoint"],
      };
      // 車が走行中で停留所に目的地にもいない場合
      if (status === 3 && !param.arrival && !param.finish) {
        // 車が経路の始点に向かっている時
        if (!param.arrange) {
          // 車が経路の始点についたら
          if (param.carToRoute.length - 1 === param.pPoint) {
            await db.execute(
              "UPDATE orderTable SET arrival = TRUE, arrange = TRUE, pRoute = 1, pPoint = 0, nextPoint = ? WHERE orderId = ?",
              [param.route[0][0], orderId]
            );
            await db.execute(
              "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)",
              [carId]
            );
          }
          // 車が経路の始点まで移動中なら
          else if (param.carToRoute.length - 1 > param.pPoint) {
            console.log("go to arrange position");
            await db.execute(
              "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 WHERE orderId = ?",
              [param.carToRoute[param.pPoint + 1], orderId]
            );
          }
        }
        // 車が経路の始点についた後
        else {
          // 目的地についたら
          if (
            param.route.length - 1 === param.pRoute &&
            param.route[param.pRoute - 1].length - 1 === param.pPoint
          ) {
            // 巡回する場合
            if (param.junkai) {
              await db.execute(
                "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, pRoute = 1, pPoint = 0 WHERE orderId = ?",
                [param.route[0][0], orderId]
              );
            }
            // 巡回しない場合
            else {
              await db.execute(
                "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, finish = TRUE WHERE orderId = ?",
                [orderId]
              );
              await db.execute(
                "UPDATE carTable SET status = 2 WHERE carId = UUID_TO_BIN(?, 1)",
                [carId]
              );
            }
          }
          // 停留所についたら
          else if (param.route[param.pRoute - 1].length - 1 === param.pPoint) {
            await db.execute(
              "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, pRoute = pRoute + 1, pPoint = 0 WHERE orderId = ?",
              [param.route[param.pRoute][0], orderId]
            );
            await db.execute(
              "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)",
              [carId]
            );
          }
          // 経路間移動中なら
          else {
            await db.execute(
              "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 WHERE orderId = ?",
              [param.route[param.pRoute - 1][param.pPoint], orderId]
            );
          }
        }
        return param.nextPoint;
      }
    }
  }
  return nextPostion;
}

async function updateCarInfo(
  carId: string,
  location: Position
): Promise<boolean> {
  return true;
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
        }
      }
      // add new user log
      lastLog.date.push(Date.now());
      lastLog.ipAddress.push(req.ip);
    }

    res.json(
      await createReply(
        req.body.carId,
        req.body.request,
        req.body.location,
        req.body.sequence,
        req.body.battery
      )
    );
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
