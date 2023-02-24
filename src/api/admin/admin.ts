/* 管理者の操作に使用する定数, 関数 */

import mysql from "mysql2/promise";
import * as db from "database";

/** 管理者識別子が有効か */
export async function existAdminTran(
  connected: mysql.PoolConnection,
  adminId: string
): Promise<boolean> {
  const isUuidSql = "SELECT IS_UUID(?) as UUID";
  const existAdminSql =
    "SELECT COUNT(*) FROM adminTable WHERE adminId = UUID_TO_BIN(?, 1) \
    AND endAt IS NULL LOCK IN SHARE MODE";
  const bin = db.extractElem(
    await db.executeTran(connected, isUuidSql, [adminId])
  );
  if (bin !== undefined && "UUID" in bin && bin["UUID"] === 1) {
    const existAdmin = db.extractElem(
      await db.executeTran(connected, existAdminSql, [adminId])
    );
    if (
      existAdmin !== undefined &&
      "COUNT(*)" in existAdmin &&
      existAdmin["COUNT(*)"] === 1
    ) {
      return true;
    }
  }
  return false;
}

/** 管理者強制終了 */
export async function terminateInterval() {
  const terminateAdminSql =
    "UPDATE adminTable SET adminId = null, endAt = NOW() \
    WHERE startAt <= SUBTIME(NOW(), '01:00:00') AND endAt IS NULL";

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await db.executeTran(conn, terminateAdminSql);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  setTimeout(() => terminateInterval(), 5000);
}
