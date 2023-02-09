/** 通行可能領域情報を取得する */

import express from "express";
import { ApiResult, PassablePoint } from "types";
import * as admin from "api/admin/admin";
import * as db from "database";
import report from "api/_report";

/** API の返り値 */
interface IsPassable extends ApiResult {
  passableInfo?: PassableInfo[];
}
interface PassableInfo extends PassablePoint {
  passableId: number;
}

/** sql */
const reqPassableSql =
  "SELECT passableId, radius, lat, lng FROM passableTable LOCK IN SHARE MODE";
const lockPWAR = "LOCK TABLES passableTable WRITE, adminTable READ";
const unlock = "UNLOCK TABLES";

/** API から呼び出される関数 */
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
          }
        }
        result.succeeded = true;
        result.passableInfo = resData;
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

/** reqPassAdmin API の実体 */
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
