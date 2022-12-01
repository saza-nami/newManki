/* 車を使えるかチェックするところで呼ばれるAPI (サービス利用開始) */

import express from "express";
import { ApiResult, Access } from "../types";
import * as db from "../database";
import report from "./_report";

interface CreateUserResult extends ApiResult {
  userId?: string; // UUID
}

// FIXME, available users of system
const maxUsers = 100;
// dos attack countermeasures proc
let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };

const lockTableSql = "LOCK TABLES userTable WRITE"; // lock table
const unlockTableSql = "UNLOCK TABLES"; // unlock table
const countUsersSql = "SELECT COUNT(*) FROM userTable WHERE endAt IS NULL";
const insertUserSql = "INSERT INTO userTable() VALUES ()";
const reqLastUserIdSql =
  "SELECT BIN_TO_UUID(userId, 1) FROM userTable \
  ORDER BY userId DESC, startAt DESC LIMIT 1";

async function createUserTran(): Promise<CreateUserResult> {
  // return value of API
  const result: CreateUserResult = { succeeded: false };

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockTableSql); // Use query!
    const users = db.extractElem(await db.executeTran(conn, countUsersSql));
    let userCount: number = maxUsers; // Active users proc
    if (users !== undefined && "COUNT(*)" in users) {
      userCount = users["COUNT(*)"];
    }
    if (userCount < maxUsers) {
      await db.executeTran(conn, insertUserSql);
      const userId = db.extractElem(
        await db.executeTran(conn, reqLastUserIdSql)
      );
      if (
        userId !== undefined &&
        "BIN_TO_UUID(userId, 1)" in userId &&
        userId["BIN_TO_UUID(userId, 1)"] !== undefined
      ) {
        result.succeeded = true;
        result.userId = userId["BIN_TO_UUID(userId, 1)"];
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlockTableSql); // Use query!
    conn.release();
  }
  return report(result);
}

export default express.Router().get("/createUser", async (req, res) => {
  try {
    // dos attack countermeasures
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
    // main process
    res.json(await createUserTran());
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
