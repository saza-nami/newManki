/** 管理者のパスワードを変更する */

import bcrypt from "bcrypt";
import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import report from "api/_report";

/** sql */
const lockAW = "LOCK TABLES adminTable WRITE";
const unlock = "UNLOCK TABLES";
const reqAdminPass =
  "SELECT adminPassHash FROM adminTable WHERE adminId = UUID_TO_BIN(?, 1) \
  AND endAt IS NULL FOR UPDATE";
const changePass =
  "UPDATE adminTable SET adminPassHash = ? , startAt = NOW(), endAt = NOW() \
  WHERE adminId = ?";
const salt = 14;

/** API から呼び出される関数 */
async function changePasswd(
  adminId: string,
  currentPasswd: string,
  newPasswd: string
) {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockAW);
    const existAdmin = db.extractElem(
      await db.executeTran(conn, reqAdminPass, [adminId])
    );
    if (existAdmin !== undefined && "adminPassHash" in existAdmin) {
      if (await bcrypt.compare(currentPasswd, existAdmin["adminPassHash"])) {
        const passHash = await bcrypt.hash(newPasswd, salt);
        await db.executeTran(conn, changePass, [passHash, adminId]);
        result.succeeded = true;
      } else {
        result.reason = "Your password is wrong.";
      }
    } else {
      result.reason = "No such administrator exists.";
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

/** changePasswd 関数の実体 */
export default express.Router().post("/changePasswd", async (req, res) => {
  try {
    if (
      typeof req.body.adminId === "undefined" ||
      typeof req.body.currentPasswd === "undefined" ||
      typeof req.body.newPasswd === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(
        await changePasswd(
          req.body.adminId,
          req.body.currentPasswd,
          req.body.newPasswd
        )
      );
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
