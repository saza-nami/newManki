// 目的地から進ませるときに呼ばれるAPI

import express from "express";
import { ApiResult } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import report from "./_report";

const reqUserInfoSql =
  "SELECT carId, orderId from userTable WHERE userId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
// request order's flags
const reqOrdersFlagsSql =
  "SELECT finish, arrival from orderTable WHERE orderId = ? LOCK IN SHARE MODE";
const reqCarStatusSql =
  "SELECT status from carTable WHERE carId = ? LOCK IN SHARE MODE";
const updateCarStatusSql = "UPDATE carTable SET status = 3 WHERE carId = ?";
const updateArrivalSql = "UPDATE orderTable SET arrival = 0 WHERE orderId = ?";

async function proceedRoute(userId: string): Promise<ApiResult> {
  // return value of API
  const result: ApiResult = { succeeded: false };
  // check parameter
  if (typeof userId === "undefined") {
    return report(result);
  }

  const conn = await db.createNewConn(); // database connection
  // begin transaction
  try {
    await conn.beginTransaction();
    // check exist user
    if ((await global.existUserTran(conn, userId)) === true) {
      const proceed = db.extractElem(
        await db.executeTran(conn, reqUserInfoSql, [userId])
      );
      if (
        proceed !== undefined &&
        "carId" in proceed &&
        proceed["carId"] !== undefined &&
        "orderId" in proceed &&
        proceed["orderId"] !== undefined
      ) {
        const order = db.extractElem(
          await db.executeTran(conn, reqOrdersFlagsSql, [proceed["orderId"]])
        );
        const status = db.extractElem(
          await db.executeTran(conn, reqCarStatusSql, [proceed["carId"]])
        );
        if (
          order !== undefined &&
          status !== undefined &&
          "finish" in order &&
          !order["finish"] &&
          "arrival" in order &&
          order["arrival"] &&
          "status" in status &&
          status["status"] === 4
        ) {
          console.log(order["finish"]);
          await db.executeTran(conn, updateCarStatusSql, [proceed["carId"]]);
          await db.executeTran(conn, updateArrivalSql, [proceed["orderId"]]);
          result.succeeded = true;
        }
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

export default express.Router().post("/proceedRoute", async (req, res) => {
  try {
    res.json(await proceedRoute(req.body.userId));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
