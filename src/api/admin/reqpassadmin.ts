/* 通行可能領域点群を渡すAPI */

import express from "express";
import { ApiResult, PassablePoint } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

interface IsPassable extends ApiResult {
  passableInfo?: PassableInfo[];
}

interface PassableInfo extends PassablePoint {
  passableId: number;
}

const reqPassableSql =
  "SELECT passableId, radius, lat, lng FROM passableTable LOCK IN SHARE MODE";
const lockPWAR = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlock = "UNLOCK TABLES";

async function reqPassable(adminId: string): Promise<IsPassable> {
  const result: IsPassable = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockPWAR);
    if ((await admin.existAdminTran(conn, adminId)) === true) {
      // 通行可能領域を取得
      const passPoints = db.extractElems(
        await db.executeTran(conn, reqPassableSql)
      );
      const resData: PassableInfo[] = [];
      if (passPoints !== undefined) {
        // 取得した通行可能領域分ループ
        if (passPoints.length === 0) {
          result.succeeded = true;
          result.passableInfo = [];
        } else {
          for (const elem of passPoints) {
            if (
              "passableId" in elem &&
              "radius" in elem &&
              "lat" in elem &&
              "lng" in elem
            ) {
              resData.push({
                passableId: Number(elem["passableId"]),
                position: {
                  lat: Number(elem["lat"]),
                  lng: Number(elem["lng"]),
                },
                radius: Number(elem["radius"]),
              });
              result.succeeded = true;
              result.passableInfo = resData;
            }
          }
        }
      }
    } else {
      result.reason = "Illegal admin.";
    }
    await conn.commit();
    await conn.query(unlock);
  } catch (err) {
    await conn.rollback();
    result.reason = err;
    if (err instanceof Error) {
      result.reason = err.message;
    }
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/reqPassAdmin", async (req, res) => {
  try {
    if (typeof req.body.adminId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await reqPassable(req.body.adminId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
