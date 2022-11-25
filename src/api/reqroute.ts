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

const reqRouteSql =
  "SELECT route, dest, junkai from routeTable WHERE routeName = ?";

async function reqRoute(userId: string, routeName: string): Promise<RouteInfo> {
  const result: RouteInfo = { succeeded: false };
  // check input
  if (typeof userId === "undefined" || typeof routeName === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn();

  // begin transaction
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      // その名前の経路を取得する
      const rows = db.extractElem(
        await db.executeTran(conn, reqRouteSql, [routeName])
      );
      if (
        rows !== undefined &&
        "route" in rows &&
        "dest" in rows &&
        "junkai" in rows
      ) {
        result.succeeded = true;
        result.route = JSON.parse(rows["route"]);
        result.dest = JSON.parse(rows["dest"]);
        result.junkai = rows["junkai"] ? true : false;
      }
    }
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
    res.json(await reqRoute(req.body.userId, req.body.routeName));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
