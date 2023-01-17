// 車の状態を変更するAPI
import bcrypt from "bcrypt";
import express from "express";
import { ApiResult } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

const reqAdminPass =
  "SELECT adminPassHash FROM adminTable \
  WHERE endAt IS NOT NULL AND adminName = ? LOCK IN SHARE MODE";
const checkStatus =
  "UPDATE carTable SET status = 6 WHERE carId = UUID_TO_BIN(?, 1) AND status = 5";
const unavailable =
  "UPDATE carTable SET status = 7 WHERE carId = UUID_TO_BIN(?, 1) AND status = 6";

async function manageCar(
  adminName: string,
  adminPass: string,
  request: string,
  carId: string
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
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
      if (await bcrypt.compare(adminPass, admin["adminPassHash"])) {
        if (await global.existCarTran(conn, carId)) {
          if (request === "check") {
            await db.executeTran(conn, checkStatus, carId);
          } else if (request === "disable") {
            await db.executeTran(conn, unavailable, carId);
          }
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
  } finally {
    conn.release();
  }
  return report(result);
}
export default express.Router().post("/manageCar", async (req, res) => {
  try {
    if (
      typeof req.body.adminName === "undefined" &&
      typeof req.body.adminPass === "undefined" &&
      typeof req.body.request === "undefined" &&
      typeof req.body.carId === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(
        await manageCar(
          req.body.adminName,
          req.body.adminPass,
          req.body.request,
          req.body.carId
        )
      );
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
