// 命令を実行するときに呼ばれるAPI

import express from "express";
import { ApiResult, Position, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

const lockUWOWPR =
  "LOCK TABLES userTable WRITE, orderTable WRITE, passableTable READ";
const unlock = "UNLOCK TABLES";
const reqUserOrderId =
  "SELECT orderId FROM userTable \
  WHERE userId = UUID_TO_BIN(?,1) AND endAt IS NULL \
  FOR UPDATE";
const addOrder = "INSERT INTO orderTable(route, dest, junkai) VALUES (?, ?, ?)";
const reqLastOrder =
  "SELECT orderId FROM orderTable ORDER BY orderId DESC \
  LIMIT 1 LOCK IN SHARE MODE";
const updUserOrderId =
  "UPDATE userTable SET orderId = ? WHERE userId = UUID_TO_BIN(?, 1)";
const reqOrderEndAt =
  "SELECT endAt FROM orderTable WHERE orderId = ? LOCK IN SHARE MODE";

async function reserveRoute(
  userId: string,
  route: Position[][],
  junkai: boolean
): Promise<ApiResult> {
  const result: ApiResult = { succeeded: false };
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockUWOWPR);
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await map.getPassPos(conn);
      // check route in passable area
      if (map.checkRoute(route, passPoints).available === true) {
        // insert route in the database
        const dest = global.routeToDest(route);
        const existOrder = db.extractElem(
          await db.executeTran(conn, reqUserOrderId, [userId])
        );
        if (existOrder !== undefined && "orderId" in existOrder) {
          if (existOrder["orderId"] === null) {
            await db.executeTran(conn, addOrder, [route, dest, junkai]);
            const created = db.extractElem(
              await db.executeTran(conn, reqLastOrder)
            );
            if (
              created !== undefined &&
              "orderId" in created &&
              created["orderId"]
            ) {
              await db.executeTran(conn, updUserOrderId, [
                created["orderId"],
                userId,
              ]);
              result.succeeded = true;
            }
          } else {
            const endAt = db.extractElem(
              await db.executeTran(conn, reqOrderEndAt, [existOrder["orderId"]])
            );
            if (endAt !== undefined && "endAt" in endAt) {
              if (endAt["endAt"] !== null) {
                await db.executeTran(conn, addOrder, [route, dest, junkai]);
                const created = db.extractElem(
                  await db.executeTran(conn, reqLastOrder)
                );
                if (
                  created !== undefined &&
                  "orderId" in created &&
                  created["orderId"]
                ) {
                  await db.executeTran(conn, updUserOrderId, [
                    created["orderId"],
                    userId,
                  ]);
                  result.succeeded = true;
                }
              } else {
                result.reason = "Reject new order!";
              }
            }
          }
        }
      } else {
        result.reason = "This route is not executable.";
      }
    } else {
      result.reason = "Illegal user.";
    }
    await conn.commit();
    await conn.query(unlock);
  } catch (err) {
    await conn.rollback();
    if (err instanceof Error) {
      result.reason = err.message;
    }
    console.log(err);
  } finally {
    conn.release();
  }
  return report(result);
}

export default express.Router().post("/execRoute", async (req, res) => {
  try {
    if (
      typeof req.body.userId === "undefined" ||
      typeof req.body.data === "undefined" ||
      typeof req.body.junkai === "undefined"
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(
        await reserveRoute(req.body.userId, req.body.data, req.body.junkai)
      );
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
