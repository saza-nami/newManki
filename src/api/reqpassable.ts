// 通行可能領域点群を渡すAPI

import express from "express";
import { ApiResult, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import report from "api/_report";

interface IsPassable extends ApiResult {
  passableInfo?: PassableInfo[];
}

interface PassableInfo extends PassablePoint {
  passableId: number;
}

const getPassables =
  "SELECT passableId, radius, lat, lng FROM passableTable LOCK IN SHARE MODE";

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
      // FOR DEBUG
      if (passPoints !== undefined) {
        // 取得した通行可能領域分ループ
        if (passPoints.length === 0) {
          result.succeeded = true;
          result.passableInfo = [];
        } else {
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
              result.succeeded = true;
              result.passableInfo = resData;
            }
          }
        }
      }
    } else {
      result.reason = "Illegal user.";
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
