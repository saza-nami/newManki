// 対車両通信 API
import express from "express";
import { ApiResult, Position, Access } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";
import * as tran from "api/scripts/transaction";

interface ReplyInfo extends ApiResult {
  response?: string;
  destination?: Position;
  sequence?: number;
}

let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };
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
          if (request === "next") {
            if (
              carInfo !== undefined &&
              "status" in carInfo &&
              carInfo["status"] !== undefined
            ) {
              result.succeeded = true;
              if (
                carInfo["status"] === 5 ||
                carInfo["status"] === 6 ||
                carInfo["status"] === 7
              ) {
                result.response = "halt";
              } else {
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
                  const nextPoint = await tran.progressTran(
                    conn,
                    carId,
                    carInfo["status"]
                  );
                  if (nextPoint !== undefined) {
                    result.destination = nextPoint;
                  }
                }
              }
            }
          } else if (request === "ping") {
            if (
              carInfo !== undefined &&
              "status" in carInfo &&
              carInfo["status"] !== undefined
            ) {
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
                console.log(orderId);
                if (
                  orderId !== undefined &&
                  "orderId" in orderId &&
                  orderId["orderId"] !== undefined
                ) {
                  const destination = db.extractElem(
                    await db.executeTran(conn, reqNext, [orderId["orderId"]])
                  );
                  console.log(destination);
                  if (
                    destination !== undefined &&
                    "nextPoint" in destination &&
                    destination["nextPoint"] !== undefined
                  ) {
                    result.destination = destination["nextPoint"];
                  }
                }
                if (carInfo["status"] === 3) {
                  result.response = "next";
                } else if (
                  carInfo["status"] === 1 &&
                  "nowPoint" in carInfo &&
                  carInfo["nowPoint"] !== undefined
                ) {
                  result.response = "stop";
                  result.destination = carInfo["nowPoint"];
                } else if (carInfo["status"] === 2 || carInfo["status"] === 4) {
                  result.response = "stop";
                }
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
          }
        } else {
          console.log("auth error");
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlock);
    conn.release();
  }
  return report(result);
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
