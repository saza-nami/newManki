import mysql from "mysql2/promise";
import * as db from "database";
import { Position } from "types";

export async function existUserTran(
  connected: mysql.PoolConnection,
  userId: string
): Promise<boolean> {
  // JSON で送られてきた userId が UUID の形式か
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  // userId が存在するか
  const existUserSql =
    "SELECT COUNT(*) FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) AND endAt IS NULL \
    LOCK IN SHARE MODE";
  const bin = db.extractElem(
    await db.executeTran(connected, isUuidSql, [userId])
  );
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

export async function existCarTran(
  connected: mysql.PoolConnection,
  carId: string
): Promise<boolean> {
  // JSON で送られてきた carId が UUID の形式か
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  const bin = db.extractElem(
    await db.executeTran(connected, isUuidSql, [carId])
  );
  // carId が存在するか
  const existCarSql =
    "SELECT COUNT(*) FROM carTable WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
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

export async function authSequenceTran(
  conn: mysql.PoolConnection,
  carId: string,
  sequence: number
): Promise<boolean> {
  const authSequenceSql =
    "SELECT sequence FROM carTable WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
  const row = db.extractElem(
    await db.executeTran(conn, authSequenceSql, [carId])
  );
  if (row !== undefined && "sequence" in row) {
    if (row["sequence"] === sequence) {
      return true;
    }
  }
  return false;
}

export function routeToDest(route: Position[][]): Position[] {
  const result: Position[] = [];
  for (const elem of route) {
    result.push(elem[0]);
  }
  result.push(route[route.length - 1].slice(-1)[0]);
  return result;
}

export async function executeEnd(
  conn: mysql.PoolConnection,
  userId: string
): Promise<boolean> {
  const getIdSql =
    "SELECT orderId, carId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
  const updateOrderSql =
    "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, \
    finish = TRUE, endAt = NOW() WHERE orderId = ? AND endAt IS NULL";
  const updateCarSql = "UPDATE carTable SET status = 2 WHERE carId = ?";
  const userTable = db.extractElem(
    await db.executeTran(conn, getIdSql, [userId])
  );
  if (
    userTable !== undefined &&
    "orderId" in userTable &&
    "carId" in userTable
  ) {
    if (userTable["orderId"] !== null) {
      await db.executeTran(conn, updateOrderSql, [userTable["orderId"]]);
    }
    if (userTable["carId"] !== null) {
      await db.executeTran(conn, updateCarSql, [userTable["carId"]]);
    }
  }
  return true;
}

export async function executeTerminate(
  conn: mysql.PoolConnection,
  userId: string
): Promise<boolean> {
  const getCarIdSql =
    "SELECT carId FROM userTable \
    WHERE userId = UUID_TO_BIN(?, 1) FOR UPDATE";
  const updateUserSql =
    "UPDATE userTable SET endAt = NOW() \
    WHERE userId = UUID_TO_BIN(?, 1) AND endAt IS NULL";
  const updateCarSql = "UPDATE carTable SET status = 1 WHERE carId = ?";
  const userTable = db.extractElem(
    await db.executeTran(conn, getCarIdSql, [userId])
  );
  await db.executeTran(conn, updateUserSql, [userId]);
  if (userTable !== undefined && "carId" in userTable) {
    if (userTable["carId"] !== null) {
      await db.executeTran(conn, updateCarSql, [userTable["carId"]]);
    }
  }
  return true;
}
