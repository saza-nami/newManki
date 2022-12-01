/* 車の情報を渡すAPI */

import express from "express";
import { ApiResult, Position } from "../../types";
import * as admin from "./admin";
import * as db from "../../database";
import report from "../_report";
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

async function reqCarInfo(adminId: string): Promise<ManageCars> {
  const result: ManageCars = { succeeded: false };
  const reqCarinfoSql =
    "SELECT BIN_TO_UUID(carId,1), status, nowPoint, battery, lastAt \
    From carTable LOCK IN SHARE MODE";
  let carInformations: CarInfo[] = [];
  if (typeof adminId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();

    if ((await admin.existAdminTran(conn, adminId)) === true) {
      const carInfo = db.extractElems(
        await db.executeTran(conn, reqCarinfoSql)
      );
      if (carInfo !== undefined) {
        for (const elem of carInfo) {
          console.log(elem);
          if (
            "BIN_TO_UUID(carId,1)" in elem &&
            "status" in elem &&
            "nowPoint" in elem &&
            "battery" in elem &&
            "lastAt" in elem
          ) {
            carInformations.push({
              carId: elem["BIN_TO_UUID(carId,1)"],
              status: elem["status"],
              nowPoint: elem["nowPoint"],
              battery: elem["battery"],
              lastAt: elem["lastAt"].toUTCString(),
            });
          }
        }
      }
      result.succeeded = true;
      result.carInformations = carInformations;
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

export default express.Router().post("/reqCarInfo", async (req, res) => {
  try {
    res.json(await reqCarInfo(req.body.adminId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
