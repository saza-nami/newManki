// 目的地から進ませるときに呼ばれるAPI

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

async function proceedRoute(userId: string): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  // 入力チェック
  if (typeof userId === "undefined") {
    return report(result);
  }
  if ((await global.existUser(userId)) === false) {
    return report(result);
  }

  // userId から紐づいた情報を取得し目的地から進ませる
  const proceed = await db.execute(
    "SELECT carId, orderId from userTable WHERE userId = UUID_TO_BIN(?, 1)",
    [userId]
  );
  if (Array.isArray(proceed) && Array.isArray(proceed[0])) {
    if ("carId" in proceed[0][0] && "orderId" in proceed[0][0]) {
      const order = await db.execute(
        "SELECT finish, arrival from orderTable WHERE orderId = ?",
        [proceed[0][0]["orderId"]]
      );
      const status = await db.execute(
        "SELECT status from carTable WHERE carId = ?",
        [proceed[0][0]["carId"]]
      );
      if (
        Array.isArray(order) &&
        Array.isArray(order[0]) &&
        Array.isArray(status) &&
        Array.isArray(status[0])
      ) {
        if (
          "finish" in order[0][0] &&
          !order[0][0]["finish"] &&
          "arrival" in order[0][0] &&
          order[0][0]["arrival"] &&
          "status" in status[0][0] &&
          status[0][0]["status"] === 4
        ) {
          console.log(order[0][0]["finish"]);
          await db.execute("UPDATE carTable SET status = 3 WHERE carId = ?", [
            proceed[0][0]["carId"],
          ]);
          await db.execute(
            "UPDATE orderTable SET arrival = 0 WHERE orderId = ?",
            [proceed[0][0]["orderId"]]
          );
          result.succeeded = true;
        }
      }
    }
  }
  return report(result);
}

export default express.Router().post("/proceedRoute", async (req, res) => {
  try {
    res.json(await proceedRoute(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
