/* 車の情報を渡すAPI */

import express from "express";
import { ApiResult, Position } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";
interface CarInfo {
  carId: number;
  status: number;
  nowPoint: Position;
  battery: number;
  lastAt: string;
}

interface ManageCars extends ApiResult {
  carInformations?: CarInfo[];
}

const lockCRAR = "LOCK TABLES carTable READ, adminTable READ";
const unlock = "UNLOCK TABLES";
const reqCarinfoSql =
  "SELECT BIN_TO_UUID(carId, 1), status, nowPoint, battery, lastAt \
  From carTable LOCK IN SHARE MODE";

async function reqCarInfo(adminId: string): Promise<ManageCars> {
  const result: ManageCars = { succeeded: false };
  let carInformations: CarInfo[] = [];
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockCRAR);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      const carInfo = db.extractElems(
        await db.executeTran(conn, reqCarinfoSql)
      );
      if (carInfo !== undefined) {
        for (const elem of carInfo) {
          if (
            elem !== undefined &&
            "BIN_TO_UUID(carId, 1)" in elem &&
            "status" in elem &&
            "nowPoint" in elem &&
            "battery" in elem &&
            "lastAt" in elem &&
            elem["BIN_TO_UUID(carId, 1)"] !== undefined &&
            elem["status"] !== undefined &&
            elem["nowPoint"] !== undefined &&
            elem["battery"] !== undefined &&
            elem["lastAt"] !== undefined
          ) {
            carInformations.push({
              carId: elem["BIN_TO_UUID(carId, 1)"],
              status: elem["status"],
              nowPoint: elem["nowPoint"],
              battery: elem["battery"],
              lastAt: elem["lastAt"].toUTCString(),
            });
          }
        }
        result.succeeded = true;
        result.carInformations = carInformations;
      }
    } else {
      result.reason = "Illegal admin.";
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

export default express.Router().post("/reqCarInfo", async (req, res) => {
  try {
    if (typeof req.body.adminId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await reqCarInfo(req.body.adminId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
