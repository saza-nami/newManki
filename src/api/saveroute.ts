// 状態遷移図の経路保存で呼ばれるAPI

import express from "express";
import { ApiResult, Position } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

interface SaveRoute extends ApiResult {
  routeName?: string;
}

const insertRouteSql =
  "INSERT INTO routeTable(routeName, route, dest) \
  VALUES (?, JSON_QUOTE(?), JSON_QUOTE(?))";

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
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  const dest = global.routeToDest(route);
  await db.execute(insertRouteSql, [routeName, route, dest]);
  result.succeeded = true;
  result.routeName = routeName;
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
