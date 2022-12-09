// 状態遷移図の既存ルート選択で呼ばれるAPI

import express from "express";
import { ApiResult, PassablePoint } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import * as map from "./scripts/map";
import report from "./_report";

interface PassableName {
  routeName: string;
  available: boolean;
}
interface RouteInfo extends ApiResult {
  passableNames?: PassableName[];
}

const reqRouteNames =
  "SELECT routeName, route FROM routeTable LOCK IN SHARE MODE";

async function routeNames(userId: string): Promise<RouteInfo> {
  // return value of API
  const result: RouteInfo = { succeeded: false };
  // check parameter
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn(); // database connection
  // begin transaction
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const rows = db.extractElems(await db.executeTran(conn, reqRouteNames));
      const passPoints: PassablePoint[] = await map.getPassPos(conn);
      const passableNames: PassableName[] = [];

      if (rows !== undefined) {
        for (const elem of rows) {
          if ("routeName" in elem && "route" in elem) {
            const routeName = elem["routeName"];
            const route = JSON.parse(elem["route"]);
            let available: boolean = true;
            for (const points of route) {
              available = true;
              for (let i = 0; i < points.length - 1; i++) {
                console.log(points[i], points[i + 1]);
                if (
                  map.isReachable(points[i], points[i + 1], passPoints) ===
                  false
                ) {
                  console.log(i);
                  available = false;
                  break;
                }
              }
              if (!available) {
                break;
              }
            }
            passableNames.push({
              routeName: routeName,
              available: available,
            });
          }
        }
      }
      result.succeeded = true;
      result.passableNames = passableNames;
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

export default express.Router().post("/routeName", async (req, res) => {
  try {
    res.json(await routeNames(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
