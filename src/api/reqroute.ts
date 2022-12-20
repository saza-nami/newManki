// 状態遷移図の既存経路選択で呼ばれるAPI

import express from "express";
import { ApiResult, Position } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

interface RouteInfo extends ApiResult {
  route?: Position[][];
  dest?: Position[];
  junkai?: boolean;
}

const reqRouteInfo =
  "SELECT route, dest, junkai FROM routeTable \
  WHERE routeName = ? LOCK IN SHARE MODE";

async function reqRoute(userId: string, routeName: string): Promise<RouteInfo> {
  const result: RouteInfo = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      const rows = db.extractElem(
        await db.executeTran(conn, reqRouteInfo, [routeName])
      );
      if (
        rows !== undefined &&
        "route" in rows &&
        rows["route"] !== undefined &&
        "dest" in rows &&
        rows["dest"] !== undefined &&
        "junkai" in rows &&
        rows["junkai"] !== undefined
      ) {
        result.succeeded = true;
        result.route = JSON.parse(rows["route"]);
        result.dest = JSON.parse(rows["dest"]);
        result.junkai = rows["junkai"] ? true : false;
      } else {
        result.reason = "There is no route with that name.";
      }
    } else {
      result.reason = "Illegal user.";
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log();
  } finally {
    conn.release();
  }
  return report(result);
}

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
