/** ユーザ識別子を発行する */

import express from "express";
import { ApiResult, Access } from "types";
import * as db from "database";
import report from "api/_report";

/** API の返り値 */
interface CreateUserResult extends ApiResult {
  userId?: string;
}

/** システム利用可能人数 [人] */
const maxUsers = 100;

/** dos 攻撃対策用変数 */
let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };

/** sql */
const lockUW = "LOCK TABLES userTable WRITE";
const unlock = "UNLOCK TABLES";
const countUsers = "SELECT COUNT(*) FROM userTable WHERE endAt IS NULL";
const addUser = "INSERT INTO userTable() VALUES ()";
const getLastUser =
  "SELECT BIN_TO_UUID(userId, 1) FROM userTable \
  ORDER BY userId DESC, startAt DESC LIMIT 1";

/** API から呼び出される関数 */
async function createUser(): Promise<CreateUserResult> {
  const result: CreateUserResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockUW);
    const users = db.extractElem(await db.executeTran(conn, countUsers));
    let userCount: number = maxUsers;
    if (
      users !== undefined &&
      "COUNT(*)" in users &&
      users["COUNT(*)"] !== undefined
    ) {
      userCount = users["COUNT(*)"];
      if (userCount < maxUsers) {
        await db.executeTran(conn, addUser);
        const userId = db.extractElem(await db.executeTran(conn, getLastUser));
        if (
          userId !== undefined &&
          "BIN_TO_UUID(userId, 1)" in userId &&
          userId["BIN_TO_UUID(userId, 1)"] !== undefined
        ) {
          result.succeeded = true;
          result.userId = userId["BIN_TO_UUID(userId, 1)"];
        } else {
          result.reason = "User creation failed.";
        }
      } else {
        result.reason = "Users exceeded the limit.";
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

/** createUser API の実体 */
export default express.Router().get("/createUser", async (req, res) => {
  try {
    if (lastLog.ipAddress.indexOf(req.ip) > -1) {
      if (Date.now() - lastLog.date[lastLog.ipAddress.indexOf(req.ip)] < 1000) {
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
    res.json(await createUser());
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
