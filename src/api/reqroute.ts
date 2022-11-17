// 状態遷移図の既存経路選択で呼ばれるAPI

import express from "express";
import { ApiResult, Position } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

interface RouteInfo extends ApiResult {
  route?: Position[][];
  dest?: Position[];
}

const reqRouteSql = "SELECT route, dest from routeTable WHERE routeName = ?";

async function reqRoute(userId: string, routeName: string): Promise<RouteInfo> {
  const result: RouteInfo = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined" || typeof routeName === "undefined") {
    return report(result);
  }
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  // その名前の経路を取得する
  const rows = await db.execute(reqRouteSql, [routeName]);
  if (Array.isArray(rows) && Array.isArray(rows[0])) {
    if (typeof rows[0][0] !== "undefined") {
      if ("route" in rows[0][0] && "dest" in rows[0][0]) {
        result.succeeded = true;
        result.route = JSON.parse(rows[0][0]["route"]);
        result.dest = JSON.parse(rows[0][0]["dest"]);
      }
    }
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
