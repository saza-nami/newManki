// 状態遷移図の経路保存で呼ばれるAPI

import express from "express";
import { ApiResult, Position, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

interface SaveRoute extends ApiResult {
  routeName?: string;
}
const nameLength = 255;
const bufferLength = 6700000;
const addRoute =
  "INSERT INTO routeTable(routeName, route, dest, junkai) \
  VALUES (?, JSON_QUOTE(?), JSON_QUOTE(?), ?)";
const searchName =
  "SELECT COUNT(*) FROM routeTable WHERE routeName = ? LOCK IN SHARE MODE";

async function saveRoute(
  userId: string,
  routeName: string,
  route: Position[][],
  junkai: boolean
) {
  const result: SaveRoute = { succeeded: false };
  const conn = await db.createNewConn();
  if (routeName.length > nameLength) {
    result.reason = "routeName is too long.";
    return report(result);
  }
  if (Buffer.byteLength(JSON.stringify(route)) > bufferLength) {
    result.reason = "route is too long.";
    return report(result);
  }
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await global.getPassPos(conn);
      const existName = db.extractElem(
        await db.executeTran(conn, searchName, [routeName])
      );
      if (existName !== undefined) {
        if ("COUNT(*)" in existName && existName["COUNT(*)"] !== undefined) {
          if (existName["COUNT(*)"] > 0) {
            result.reason = "Duplicate routeName.";
          } else {
            // 経路チェック
            const checkResult = map.checkRoute(route, passPoints);
            if (checkResult.reason !== undefined) {
              result.reason =
                "RouteNo." +
                checkResult.reason.route +
                " PointNo." +
                checkResult.reason.pos +
                " could not be reached.";
            } else {
              const dest = global.routeToDest(route);
              await db.executeTran(conn, addRoute, [
                routeName,
                route,
                dest,
                junkai,
              ]);
              result.succeeded = true;
              result.routeName = routeName;
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
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/saveRoute", async (req, res) => {
  try {
    if (
      typeof req.body.userId === "undefined" ||
      typeof req.body.routeName === "undefined" ||
      typeof req.body.data === "undefined" ||
      typeof req.body.junkai === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(
        await saveRoute(
          req.body.userId,
          req.body.routeName,
          req.body.data,
          req.body.junkai
        )
      );
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
