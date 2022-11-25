/* 車の情報を渡すAPI */

import express from "express";
import { ApiResult, Position } from "../../types";
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

async function getCarInfo(): Promise<ManageCars> {
  const result: ManageCars = { succeeded: false };
  const conn = await db.createNewConn();
  let carInformations: CarInfo[] = [];

  try {
    await conn.beginTransaction();
    const carInfo = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, status, nowPoint, battery, lastAt From carTable"
      )
    );
    if (carInfo !== undefined) {
      for (const elem of carInfo) {
        if (
          "carId" in elem &&
          "status" in elem &&
          "nowPoint" in elem &&
          "battery" in elem &&
          "lastAt" in elem
        ) {
          carInformations.push({
            carId: elem["carId"],
            status: elem["status"],
            nowPoint: elem["nowPoint"],
            battery: elem["battery"],
            lastAt: elem["lastAt"].toString(),
          });
        }
      }
    }
    result.succeeded = true;
    result.carInformations = carInformations;
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().get("/getCarInfo", async (req, res) => {
  try {
    res.json(await getCarInfo());
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
