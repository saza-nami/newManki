/** 保存済みの経路を取得する */

import express from "express";
import { ApiResult, Position, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

/** API の返り値 */
interface RouteInfo extends ApiResult {
  route?: Position[][];
  dest?: Position[];
  junkai?: boolean;
}

/** sql */
const reqRouteInfo =
  "SELECT route, dest, junkai FROM routeTable \
  WHERE routeName = ? LOCK IN SHARE MODE";

/** API から呼び出される関数 */
async function reqRoute(userId: string, routeName: string): Promise<RouteInfo> {
  const result: RouteInfo = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await global.getPassPos(conn);
      const row = db.extractElem(
        await db.executeTran(conn, reqRouteInfo, [routeName])
      );
      if (
        row !== undefined &&
        "route" in row &&
        row["route"] !== undefined &&
        "dest" in row &&
        row["dest"] !== undefined &&
        "junkai" in row &&
        row["junkai"] !== undefined
      ) {
        if (map.checkRoute(row["route"], passPoints).available) {
          result.succeeded = true;
          result.route = JSON.parse(row["route"]);
          result.dest = JSON.parse(row["dest"]);
          result.junkai = row["junkai"] ? true : false;
        } else {
          result.reason = "This route is not executable.";
        }
      } else {
        result.reason = "There is no route with that name.";
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
    console.log();
  } finally {
    conn.release();
  }
  return report(result);
}

/** reqRoute API の実体 */
export default express.Router().post("/reqRoute", async (req, res) => {
  try {
    if (
      typeof req.body.userId === "undefined" ||
      typeof req.body.routeName === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await reqRoute(req.body.userId, req.body.routeName));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
