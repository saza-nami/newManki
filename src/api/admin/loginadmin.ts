/** 管理者識別子を発行する */

import bcrypt from "bcrypt";
import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import report from "api/_report";

/** API の返り値 */
interface adminInfo extends ApiResult {
  adminId?: string;
}

/** sql */
const reqAdminPass =
  "SELECT adminPassHash, endAt FROM adminTable \
  WHERE adminName = ? LOCK IN SHARE MODE";
const updateAdmin =
  "UPDATE adminTable SET adminId = (UUID_TO_BIN(UUID(), 1)), startAt = NOW(),\
  endAt = NULL WHERE adminName = ?";
const reqAdminId =
  "SELECT BIN_TO_UUID(adminId, 1) FROM adminTable \
  WHERE adminName = ? LOCK IN SHARE MODE";

/** API から呼び出される関数 */
async function loginAdmin(
  adminName: string,
  adminPass: string
): Promise<adminInfo> {
  const result: adminInfo = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    const admin = db.extractElem(
      await db.executeTran(conn, reqAdminPass, [adminName])
    );
    if (
      admin !== undefined &&
      "adminPassHash" in admin &&
      admin["adminPassHash"] !== undefined
    ) {
      if ("endAt" in admin && admin["endAt"] !== null) {
        if (await bcrypt.compare(adminPass, admin["adminPassHash"])) {
          await db.executeTran(conn, updateAdmin, [adminName]);
          const adminId = db.extractElem(
            await db.executeTran(conn, reqAdminId, [adminName])
          );
          if (
            adminId !== undefined &&
            "BIN_TO_UUID(adminId, 1)" in adminId &&
            adminId["BIN_TO_UUID(adminId, 1)"] !== undefined
          ) {
            result.succeeded = true;
            result.adminId = adminId["BIN_TO_UUID(adminId, 1)"];
          }
        } else {
          result.reason = "Your password is wrong.";
        }
      } else {
        result.reason = "The administrator is in use.";
      }
    } else {
      result.reason = "Your name is wrong.";
    }
    await conn.commit();
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

/** loginAdmin API の実体 */
export default express.Router().post("/loginAdmin", async (req, res) => {
  try {
    if (
      typeof req.body.adminName === "undefined" ||
      typeof req.body.adminPass === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await loginAdmin(req.body.adminName, req.body.adminPass));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
