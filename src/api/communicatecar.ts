// 対車両通信 API
import express from "express";
import { ApiResult, Position, proceed, Access } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";
import * as tran from "api/scripts/transaction";

interface ReplyInfo extends ApiResult {
  responce?: string;
  location?: Position;
  sequence?: number;
}

let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };
// lock tables
const lockTablesSql = "LOCK TABLES carTable WRITE";
// unlock tables
const unlockTablesSql = "UNLOCK TABLES";
const insertCarSql =
  "INSERT INTO carTable (sequence, nowPoint, battery) \
  VALUES (?, ?, ?)";
const reqLastCarIdSql =
  "SELECT BIN_TO_UUID(carId, 1) FROM carTable \
  ORDER BY carId DESC, lastAt DESC LIMIT 1 LOCK IN SHARE MODE";
const updateCarInfoSql =
  "UPDATE carTable SET sequence = ?, nowPoint = ?, battery = ?, \
  lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)";
const haltCarSql =
  "UPDATE carTable SET status = 5, sequence = ?, nowPoint = ?, battery = ?, \
  lastAt = NOW() WHERE carId = UUID_TO_BIN(?, 1)";

async function createReply(
  carId: string,
  request: string,
  location: Position,
  sequence: number,
  battery: number
): Promise<ReplyInfo> {
  const result: ReplyInfo = { succeeded: false };
  const rndSeq = Math.trunc(Math.random() * 4294967294) + 1; // FIXME
  // check input
  if (
    typeof request === "undefined" &&
    typeof location === "undefined" &&
    typeof battery === "undefined"
  ) {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    if (request === "hello") {
      if (typeof location !== undefined && typeof battery !== undefined) {
        await conn.query(lockTablesSql);
        await db.executeTran(conn, insertCarSql, [rndSeq, location, battery]);
        const carInfo = db.extractElem(
          await db.executeTran(conn, reqLastCarIdSql)
        );
        if (carInfo !== undefined && "BIN_TO_UUID(carId, 1)" in carInfo) {
          result.succeeded = true;
          result.responce = carInfo["BIN_TO_UUID(carId, 1)"];
          result.sequence = rndSeq;
        }
      }
    } else {
      if (typeof carId !== "undefined" && typeof sequence !== "undefined") {
        if (
          (await global.existCarTran(conn, carId)) &&
          (await global.authSequenceTran(conn, carId, sequence))
        ) {
          if (request === "next") {
            /* 車の状態(carTable.status)の確認を行う */
            result.location = await tran.progressTran(conn, carId);
            result.succeeded = true;
          } else if (request === "ping") {
            /* 車の状態(carTable.status)の確認を行う */
            await db.executeTran(conn, updateCarInfoSql, [
              rndSeq,
              location,
              battery,
              carId,
            ]);
          } else if (request === "halt") {
            await db.executeTran(conn, haltCarSql, [
              rndSeq,
              location,
              battery,
              carId,
            ]);
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
