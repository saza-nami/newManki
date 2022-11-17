// 終わり画面で呼ばれるAPI (サービス利用終了)

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

async function terminate(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  let bool: boolean =
    (await global.executeEnd(userId)) &&
    (await global.executeTerminate(userId));
  if (!bool) {
    return report(result);
  }
  result.succeeded = true;
  return report(result);
}

export default express.Router().post("/terminate", async (req, res) => {
  try {
    res.json(await terminate(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
