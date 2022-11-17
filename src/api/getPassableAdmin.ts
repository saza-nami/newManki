// 通行可能領域点群を渡すAPI

import express from "express";
import { ApiResult, PassablePoint } from "../types";
import * as db from "../database";
import report from "./_report";

interface IsPasable extends ApiResult {
  passableInfo?: PassableInfo[];
}

interface PassableInfo extends PassablePoint {
  passableId: number;
}

const getPassableSql = "SELECT radius, lat, lng from passableTable";

async function getPassableAdmin(): Promise<IsPasable> {
  const result: IsPasable = { succeeded: false };

  // 通行可能領域を取得
  const passPoints = await db.execute(getPassableSql);
  const resData: PassableInfo[] = [];

  if (Array.isArray(passPoints) && Array.isArray(passPoints[0])) {
    // 取得した通行可能領域分ループ
    for (const elem of passPoints[0]) {
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
  return report(result);
}

export default express.Router().get("/getPassableAdmin", async (req, res) => {
  try {
    res.json(await getPassableAdmin());
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
