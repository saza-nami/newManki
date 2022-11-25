/* 通行可能領域点群を渡すAPI */

import express from "express";
import { ApiResult, PassablePoint } from "../../types";
import * as db from "../../database";
import report from "../_report";

interface IsPassable extends ApiResult {
  passableInfo?: PassableInfo[];
}

interface PassableInfo extends PassablePoint {
  passableId: number;
}

const getPassableSql = "SELECT passableId, radius, lat, lng from passableTable";

async function getPassable(): Promise<IsPassable> {
  const result: IsPassable = { succeeded: false };
  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    // 通行可能領域を取得
    const passPoints = db.extractElems(
      await db.executeTran(conn, getPassableSql)
    );
    const resData: PassableInfo[] = [];
    if (passPoints !== undefined) {
      // 取得した通行可能領域分ループ
      for (const elem of passPoints) {
        if (
          "passableId" in elem &&
          "radius" in elem &&
          "lat" in elem &&
          "lng" in elem
        ) {
          resData.push({
            passableId: Number(elem["passableId"]),
            position: { lat: Number(elem["lat"]), lng: Number(elem["lng"]) },
            radius: Number(elem["radius"]),
          });
        }
      }
    }
    result.succeeded = true;
    result.passableInfo = resData;
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().get("/getPassable", async (req, res) => {
  try {
    res.json(await getPassable());
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
