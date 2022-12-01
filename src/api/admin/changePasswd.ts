/* パスワード変更 */

import bcrypt from "bcrypt";
import express from "express";
import { ApiResult } from "../../types";
import * as db from "../../database";
import report from "../_report";

const lockTableSql = "LOCK TABLES adminTable WRITE";
const unlockTableSql = "UNLOCK TABLES";
const reqAdminPassSql =
  "SELECT adminPassHash FROM adminTable WHERE adminId = UUID_TO_BIN(?, 1) \
  AND endAt IS NULL";
const changePasswdSql =
  "UPDATE adminTable SET adminPassHash = ? , startAt = NOW(), endAt = NOW() \
  WHERE adminId = ?";
const salt = 14;

async function changePasswd(
  adminId: string,
  currentPasswd: string,
  newPasswd: string
) {
  const result: ApiResult = { succeeded: false };
  if (
    typeof adminId === "undefined" &&
    typeof currentPasswd === "undefined" &&
    typeof newPasswd === "undefined"
  ) {
    return report(result);
  }
  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    await conn.query(lockTableSql);
    const existAdmin = db.extractElem(
      await db.executeTran(conn, reqAdminPassSql, [adminId])
    );
    if (existAdmin !== undefined && "adminPassHash" in existAdmin) {
      if (await bcrypt.compare(currentPasswd, existAdmin["adminPassHash"])) {
        const passHash = await bcrypt.hash(newPasswd, salt);
        await db.executeTran(conn, changePasswdSql, [passHash, adminId]);
        result.succeeded = true;
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlockTableSql);
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/changePasswd", async (req, res) => {
  try {
    res.json(
      await changePasswd(
        req.body.adminId,
        req.body.currentPasswd,
        req.body.newPasswd
      )
    );
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
