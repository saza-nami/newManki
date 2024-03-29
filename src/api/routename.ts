/** 全ての保存済みの経路名情報を取得する */

import express from "express";
import { ApiResult, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

/** API の返り値 */
interface RouteInfo extends ApiResult {
  passableNames?: PassableName[];
}
interface PassableName {
  routeName: string;
  available: boolean;
}

/** sql */
const getRouteNames =
  "SELECT routeName, route FROM routeTable LOCK IN SHARE MODE";

/** API から呼び出される関数 */
async function routeNames(userId: string): Promise<RouteInfo> {
  const result: RouteInfo = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await global.getPassPos(conn);
      const rows = db.extractElems(await db.executeTran(conn, getRouteNames));
      const passableNames: PassableName[] = [];
      if (rows !== undefined) {
        if (rows.length === 0) {
          result.succeeded = true;
          result.passableNames = [];
        } else {
          for (const elem of rows) {
            if ("routeName" in elem && "route" in elem) {
              const routeName = elem["routeName"];
              const route = JSON.parse(elem["route"]);
              const checkResult = map.checkRoute(route, passPoints);
              passableNames.push({
                routeName: routeName,
                available: checkResult.available,
              });
              result.succeeded = true;
              result.passableNames = passableNames;
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
    if (err instanceof Error) {
      result.reason = err.message;
    }
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

/** routeName API の実体 */
export default express.Router().post("/routeName", async (req, res) => {
  try {
    if (typeof req.body.userId === "undefined") {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await routeNames(req.body.userId));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
