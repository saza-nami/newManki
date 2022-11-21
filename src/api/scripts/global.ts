import mysql from "mysql2/promise";
import * as db from "../../database";
import { Position } from "../../types";
import report from "../_report";

export async function existUser(userId: string): Promise<boolean> {
  // JSON で送られてきた userId が UUID の形式か
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  const bin = await db.execute(isUuidSql, [userId]);
  // userId が存在するか
  const existUserSql =
    "SELECT COUNT(*) from userTable WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL";
  if (Array.isArray(bin) && Array.isArray(bin[0])) {
    if ("UUID" in bin[0][0] && bin[0][0]["UUID"] === 1) {
      const rows = await db.execute(existUserSql, [userId]);
      if (Array.isArray(rows) && Array.isArray(rows[0])) {
        if ("COUNT(*)" in rows[0][0] && rows[0][0]["COUNT(*)"] === 1) {
          return true;
        }
      }
    }
  }
  return false;
}

export async function existUserTran(
  connected: mysql.PoolConnection,
  userId: string
): Promise<boolean> {
  // JSON で送られてきた userId が UUID の形式か
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  const bin = db.extractElem(
    await db.executeTran(connected, isUuidSql, [userId])
  );
  // userId が存在するか
  const existUserSql =
    "SELECT COUNT(*) from userTable \
    WHERE userId = UUID_TO_BIN(?, 1) and endAt IS NULL \
    LOCK IN SHARE MODE";
  if (bin !== undefined && "UUID" in bin && bin["UUID"] === 1) {
    const existUser = db.extractElem(
      await db.executeTran(connected, existUserSql, [userId])
    );
    if (
      existUser !== undefined &&
      "COUNT(*)" in existUser &&
      existUser["COUNT(*)"] === 1
    ) {
      return true;
    }
  }
  return false;
}

export async function existCar(carId: string): Promise<boolean> {
  // JSON で送られてきた carId が UUID の形式か
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  const bin = await db.execute(isUuidSql, [carId]);
  // carId が存在するか
  const existCarSql =
    "SELECT COUNT(*) from carTable WHERE carId = UUID_TO_BIN(?, 1)";
  if (Array.isArray(bin) && Array.isArray(bin[0])) {
    if ("UUID" in bin[0][0] && bin[0][0]["UUID"] === 1) {
      const rows = await db.execute(existCarSql, [carId]);
      if (Array.isArray(rows) && Array.isArray(rows[0])) {
        if ("COUNT(*)" in rows[0][0] && rows[0][0]["COUNT(*)"] === 1) {
          return true;
        }
      }
    }
  }
  return false;
}

/*
export async function existCar(
  connected: mysql.PoolConnection,
  carId: string
): Promise<boolean> {
  // JSON で送られてきた carId が UUID の形式か
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  const bin = await db.executeTran(connected, isUuidSql, [carId]);
  // carId が存在するか
  const existCarSql =
    "SELECT COUNT(*) from carTable WHERE carId = UUID_TO_BIN(?, 1)";
  if (Array.isArray(bin) && Array.isArray(bin[0])) {
    if ("UUID" in bin[0][0] && bin[0][0]["UUID"] === 1) {
      const rows = await db.executeTran(connected, existCarSql, [carId]);
      if (Array.isArray(rows) && Array.isArray(rows[0])) {
        if ("COUNT(*)" in rows[0][0] && rows[0][0]["COUNT(*)"] === 1) {
          return true;
        }
      }
    }
  }
  return false;
}
*/

export function routeToDest(route: Position[][]): Position[] {
  const result: Position[] = [];
  for (const elem of route) {
    result.push(elem[0]);
  }
  result.push(route[route.length - 1].slice(-1)[0]);
  return result;
}

export async function executeEnd(userId: string): Promise<boolean> {
  console.log("END");
  const getIdSql =
    "SELECT orderId, carId FROM userTable WHERE userId = UUID_TO_BIN(?, 1)";
  const userTable = await db.execute(getIdSql, [userId]);
  if (Array.isArray(userTable) && Array.isArray(userTable[0])) {
    if ("orderId" in userTable[0][0] && "carId" in userTable[0][0]) {
      if (userTable[0][0]["orderId"] !== null) {
        await db.execute(
          "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, finish = TRUE, endAt = now() WHERE orderId = ?",
          [userTable[0][0]["orderId"]]
        );
      }
      if (userTable[0][0]["carId"]) {
        await db.execute("UPDATE carTable SET status = 2 WHERE carId = ?", [
          userTable[0][0]["carId"],
        ]);
      }
      return true;
    }
  }
  return false;
}

export async function executeTerminate(userId: string): Promise<boolean> {
  console.log("TERMINATE");
  const getCarIdSql =
    "SELECT carId FROM userTable WHERE userId = UUID_TO_BIN(?, 1)";
  const userTable = await db.execute(getCarIdSql, [userId]);
  if (Array.isArray(userTable) && Array.isArray(userTable[0])) {
    if ("carId" in userTable[0][0]) {
      await db.execute(
        "UPDATE userTable SET endAt = now() WHERE userId = UUID_TO_BIN(?, 1)",
        [userId]
      );
      if (userTable[0][0]["carId"] !== null) {
        await db.execute("UPDATE carTable SET status = 1 WHERE carId = ?", [
          userTable[0][0]["carId"],
        ]);
      }
      return true;
    }
  }
  return false;
}
