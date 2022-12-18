/* ワンタイム管理者作成 */

import bcrypt from "bcrypt";
import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import report from "api/_report";

interface adminInfo extends ApiResult {
  adminId?: string;
  reason?: string;
}

const reqAdminPassSql =
  "SELECT adminPassHash FROM adminTable \
  WHERE endAt IS NOT NULL AND adminName = ? LOCK IN SHARE MODE";
const updateAdminSql =
  "UPDATE adminTable SET adminId = (UUID_TO_BIN(UUID(), 1)), startAt = NOW(),\
  endAt = NULL WHERE adminName = ?";
const reqAdminIdSql =
  "SELECT BIN_TO_UUID(adminId, 1) FROM adminTable \
  WHERE adminName = ? LOCK IN SHARE MODE";

async function loginAdmin(
  adminName: string,
  adminPass: string
): Promise<adminInfo> {
  const result: adminInfo = { succeeded: false };
  console.log(adminName, adminPass);
  if (typeof adminName === undefined && typeof adminPass === undefined) {
    return report(result);
  }
  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    const admin = db.extractElem(
      await db.executeTran(conn, reqAdminPassSql, [adminName])
    );

    if (admin !== undefined && "adminPassHash" in admin) {
      if (await bcrypt.compare(adminPass, admin["adminPassHash"])) {
        await db.executeTran(conn, updateAdminSql, [adminName]);
        const adminId = db.extractElem(
          await db.executeTran(conn, reqAdminIdSql, [adminName])
        );
        if (
          adminId !== undefined &&
          "BIN_TO_UUID(adminId, 1)" in adminId &&
          adminId["BIN_TO_UUID(adminId, 1)"] !== undefined
        ) {
          result.succeeded = true;
          result.adminId = adminId["BIN_TO_UUID(adminId, 1)"];
        }
      }
      console.log(await bcrypt.compare(adminPass, admin["adminPassHash"]));
    } else {
      result.reason = "Your name or password is wrong.";
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/loginAdmin", async (req, res) => {
  try {
    res.json(await loginAdmin(req.body.adminName, req.body.adminPass));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
