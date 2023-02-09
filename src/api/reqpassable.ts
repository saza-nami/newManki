/** 通行可能領域情報を取得する */

import express from "express";
import { ApiResult, PassablePoint } from "types";
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
const getPassables =
  "SELECT passableId, radius, lat, lng FROM passableTable LOCK IN SHARE MODE";

/** API から呼び出される関数 */
async function reqPassable(userId: string): Promise<IsPassable> {
  const result: IsPassable = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    const resData: PassableInfo[] = [];
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints = db.extractElems(
        await db.executeTran(conn, getPassables)
      );
      if (passPoints !== undefined) {
        for (const elem of passPoints) {
          if (
            "passableId" in elem &&
            elem["passableId"] !== undefined &&
            "radius" in elem &&
            elem["radius"] !== undefined &&
            "lat" in elem &&
            elem["lat"] !== undefined &&
            "lng" in elem &&
            elem["lng"] !== undefined
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
      result.reason = "Illegal user.";
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

/** reqPassable API の実体 */
export default express.Router().post("/reqPassable", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await reqPassable(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
