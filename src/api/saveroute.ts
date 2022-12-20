// 状態遷移図の経路保存で呼ばれるAPI

import express from "express";
import { ApiResult, Position, PassablePoint } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import * as map from "./scripts/map";
import report from "./_report";

interface SaveRoute extends ApiResult {
  routeName?: string;
  message?: string;
}

const addRoute =
  "INSERT INTO routeTable(routeName, route, dest, junkai) \
  VALUES (?, JSON_QUOTE(?), JSON_QUOTE(?), ?)";

async function saveRoute(
  userId: string,
  routeName: string,
  route: Position[][],
  junkai: boolean
) {
  const result: SaveRoute = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await map.getPassPos(conn);
      let reached = true;
      for (let i = 0; i < route.length; i++) {
        for (let j = 0; j < route[i].length - 1; j++) {
          if (
            map.isReachable(route[i][j], route[i][j + 1], passPoints) === false
          ) {
            reached = false;
            result.message =
              "RouteNo." + i + " PointNo." + j + " could not be reached.";
          }
          if (!reached) break;
        }
        if (!reached) break;
      }
      if (reached) {
        const dest = global.routeToDest(route);
        await db.executeTran(conn, addRoute, [routeName, route, dest, junkai]);
        result.succeeded = true;
        result.routeName = routeName;
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
