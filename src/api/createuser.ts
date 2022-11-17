// 車を使えるかチェックするところで呼ばれるAPI (サービス利用開始)

import express from "express";
import { ApiResult, Access } from "../types";
import * as db from "../database";
import report from "./_report";

interface CreateUserResult extends ApiResult {
  userId?: string; // UUID
}

const createUserSql = "CALL createUserProc(?)";
const maxUsers = 100; // FIXME

let lastLog: Access = { date: [0], ipAddress: ["anyonyomarubobo"] };

async function createUserTran(): Promise<CreateUserResult> {
  const result: CreateUserResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query("LOCK TABLES userTable WRITE");
    const users = db.extractElem(
      await db.executeTran(
        conn,
        "SELECT COUNT(*) FROM userTable WHERE endAt IS NULL"
      )
    );
    let userCount: number = maxUsers; // 利用中ユーザ数
    if (users !== undefined && "COUNT(*)" in users) {
      userCount = users["COUNT(*)"];
    }
    if (userCount < maxUsers) {
      await db.executeTran(conn, "INSERT INTO userTable() VALUES ()");
      const userId = db.extractElem(
        await db.executeTran(
          conn,
          "SELECT BIN_TO_UUID(userId, 1) FROM userTable ORDER BY userId DESC, startAt DESC LIMIT 1"
        )
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
    await conn.query("UNLOCK TABLES");
    conn.release();
  }
  return report(result);
}

// lastLogが限界を迎えないような実装にするべき
export default express.Router().get("/createUser", async (req, res) => {
  try {
    // Dos 対策
    if (lastLog.ipAddress.indexOf(req.ip) >= 0) {
      // 10 秒以内に同じ Ip から API を叩かれたら Dos 攻撃とみなす
      if (
        Date.now() - lastLog.date[lastLog.ipAddress.indexOf(req.ip)] <
        10000
      ) {
        // 攻撃の度に時間を更新する
        lastLog.date[lastLog.ipAddress.indexOf(req.ip)] = Date.now();
        return res.json({ succeeded: false });
      }
    }
    lastLog.date.push(Date.now());
    lastLog.ipAddress.push(req.ip);

    res.json(await createUserTran());
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
