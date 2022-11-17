// 命令を終了するときに呼ばれるAPI

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

async function endRoute(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  if ((await global.executeEnd(userId)) === false) {
    return report(result);
  }
  result.succeeded = true;
  return report(result);
}

export default express.Router().post("/endRoute", async (req, res) => {
  try {
    res.json(await endRoute(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
