// 状態遷移図の経路保存で呼ばれるAPI

import express from "express";
import { ApiResult, Position, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

interface SaveRoute extends ApiResult {
  routeName?: string;
  message?: string;
}

const insertRouteSql =
  "INSERT INTO routeTable(routeName, route, dest, junkai) \
  VALUES (?, JSON_QUOTE(?), JSON_QUOTE(?), ?)";

async function saveRoute(
  userId: string,
  routeName: string,
  route: Position[][],
  junkai: boolean
) {
  const result: SaveRoute = { succeeded: false };
  // 入力チェック
  if (
    typeof userId === "undefined" ||
    typeof routeName === "undefined" ||
    typeof route === "undefined" ||
    typeof junkai === "undefined"
  ) {
    return report(result);
  }

  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await map.getPassPos(conn);
      // 経路チェック
      const checkResult = map.checkRoute(route, passPoints);
      if (checkResult.reason !== undefined) {
        result.message =
          "RouteNo." +
          checkResult.reason.route +
          " PointNo." +
          checkResult.reason.pos +
          " could not be reached.";
      } else {
        const dest = global.routeToDest(route);
        await db.executeTran(conn, insertRouteSql, [
          routeName,
          route,
          dest,
          junkai,
        ]);
        result.succeeded = true;
        result.routeName = routeName;
      }
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

export default express.Router().post("/saveRoute", async (req, res) => {
  try {
    res.json(
      await saveRoute(
        req.body.userId,
        req.body.routeName,
        req.body.data,
        req.body.junkai
      )
    );
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
