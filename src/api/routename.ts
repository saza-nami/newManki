// 状態遷移図の既存ルート選択で呼ばれるAPI

import express from "express";
import { ApiResult, Position, PassablePoint } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import * as map from "./scripts/map";
import report from "./_report";

interface RouteNames extends ApiResult {
  routeNames?: string[];
  available?: boolean[];
}

const lockTableSql = "LOCK TABLES userTable WRITE"; // lock table
const unlockTableSql = "UNLOCK TABLES"; // unlock table
const reqRouteNames = "SELECT routeName, route FROM routeTable";

async function routeNames(userId: string): Promise<RouteNames> {
  // return value of API
  const result: RouteNames = { succeeded: false };
  // check parameter
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn(); // database connection
  // begin transaction
  try {
    await conn.beginTransaction();
    await conn.query(lockTableSql);
    if ((await global.existUserTran(conn, userId)) === true) {
      const rows = db.extractElems(await db.executeTran(conn, reqRouteNames));
      let routeNames = [];
      let availableFlag: boolean[] = [];
      let routes: Position[][][] = [];
      const passPoints: PassablePoint[] = await map.getPassPos(conn);

      // Tie routeName to route
      if (rows !== undefined) {
        for (const elem of rows) {
          if ("routeName" in elem && "route" in elem) {
            routes.push(JSON.parse(elem["route"]));
            routeNames.push(elem["routeName"].toString());
          }
        }
      }

      let reachable: boolean = true;
      for (const route in routes) {
        reachable = true;
        availableFlag[route] = false;
        for (const points in routes[route]) {
          for (let i = 0; i < routes[route][points].length - 1; i++) {
            if (
              map.isReachable(
                routes[route][points][i],
                routes[route][points][i + 1],
                passPoints
              ) === null
            ) {
              reachable = false;
              break;
            }
          }
          if (!reachable) {
            break;
          }
        }
        if (reachable) {
          availableFlag[route] = true;
        }
      }
      result.succeeded = true;
      result.routeNames = routeNames;
      result.available = availableFlag;
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlockTableSql);
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
