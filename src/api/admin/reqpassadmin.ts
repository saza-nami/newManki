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

async function reqPassable(adminId: string): Promise<IsPassable> {
  const result: IsPassable = { succeeded: false };
  if (typeof adminId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
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
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/reqPassAdmin", async (req, res) => {
  try {
    res.json(await reqPassable(req.body.adminId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
