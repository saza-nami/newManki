// 命令を実行するときに呼ばれるAPI

import express from "express";
import { ApiResult, Position, PassablePoint } from "../types";
import * as db from "../database";
import * as global from "./scripts/global";
import * as map from "./scripts/map";
import report from "./_report";

interface ExecRoute extends ApiResult {
  message?: string;
}

const createOrderSql = "CALL createOrder(?, ?, ?, ?, @a, @b, @c)";

async function reserveRoute(
  userId: string,
  route: Position[][],
  junkai: boolean
): Promise<ExecRoute> {
  const result: ExecRoute = { succeeded: false };

  // 入力チェック
  if (
    typeof userId === "undefined" ||
    typeof route === "undefined" ||
    typeof junkai === "undefined"
  ) {
    return report(result);
  }

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query("LOCK TABLES orderTable WRITE");
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await map.getAllPassPos(conn);
      // 経路チェック
      for (let i = 0; i < route.length; i++) {
        for (let j = 0; j < route[i].length - 1; j++) {
          if (
            map.isReachable(route[i][j], route[i][j + 1], passPoints) === null
          ) {
            result.message = "Unreachable!";
            return report(result);
          }
        }
      }

      const dest = global.routeToDest(route);
      // 命令をDBに登録
      const existOrder = db.extractElem(
        await db.executeTran(
          conn,
          "SELECT orderId FROM userTable \
          WHERE userId = UUID_TO_BIN(?,1) AND endAt IS NULL \
          LOCK IN SHARE MODE",
          [userId]
        )
      );
      if (existOrder !== undefined && "orderId" in existOrder) {
        if (existOrder["orderId"] === null) {
          await db.executeTran(
            conn,
            "INSERT INTO orderTable(route, dest, junkai) VALUES (?, ?, ?)",
            [route, dest, junkai]
          );
          const createdOrderId = db.extractElem(
            await db.executeTran(
              conn,
              "SELECT orderId FROM orderTable ORDER BY orderId DESC LIMIT 1"
            )
          );
          if (createdOrderId !== undefined && "orderId" in createdOrderId) {
            await db.executeTran(
              conn,
              "UPDATE userTable SET orderId = ? \
              WHERE userId = UUID_TO_BIN(?,1) \
              LOCK IN SHARE MODE",
              [createdOrderId["orderId"], userId]
            );
          }
          result.succeeded = true;
        } else {
          const endAt = db.extractElem(
            await db.executeTran(
              conn,
              "SELECT endAt FROM orderTable WHERE orderId = ?",
              [existOrder["orderId"]]
            )
          );
          if (endAt !== undefined && "endAt" in endAt) {
            if (endAt["endAt"] !== null) {
              await db.executeTran(
                conn,
                "INSERT INTO orderTable(route, dest, junkai) VALUES (?, ?, ?)",
                [route, dest, junkai]
              );
              const createdOrderId = db.extractElem(
                await db.executeTran(
                  conn,
                  "SELECT orderId FROM orderTable ORDER BY orderId DESC LIMIT 1"
                )
              );
              if (createdOrderId !== undefined && "orderId" in createdOrderId) {
                await db.executeTran(
                  conn,
                  "UPDATE userTable SET orderId = ? \
                  WHERE userId = UUID_TO_BIN(?,1) \
                  LOCK IN SHARE MODE",
                  [createdOrderId["orderId"], userId]
                );
              }
              result.succeeded = true;
            } else {
              result.message = "Reject new order!";
            }
          }
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query("UNLOCK TABLES");
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/execRoute", async (req, res) => {
  try {
    res.json(
      await reserveRoute(req.body.userId, req.body.data, req.body.junkai)
    );
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
