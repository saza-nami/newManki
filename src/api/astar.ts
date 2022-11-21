/* 経路探索API */

import express from "express";
import { ApiResult, Position, PassablePoint } from "../types";
import * as astar from "./scripts/notNotAstar";
import * as db from "../database";
import * as global from "./scripts/global";
import * as map from "./scripts/map";
import report from "./_report";

interface CreateRoute extends ApiResult {
  route?: Position[] | null;
  reason?: string;
}

async function createRoute(
  userId: string,
  target: Position[]
): Promise<CreateRoute> {
  // return values of API
  const result: CreateRoute = { succeeded: false };
  // check input
  if (typeof userId === "undefined" || typeof target === "undefined") {
    return report(result);
  }
  if (target.length < 2) {
    return report(result);
  }

  const conn = await db.createNewConn(); // database connection

  // begin transaction
  try {
    await conn.beginTransaction();
    // check exist user
    if ((await global.existUserTran(conn, userId)) === true) {
      const passPoints: PassablePoint[] = await map.getPassPos(conn);
      for (const t of target) {
        if (!map.isPassable(t, passPoints)) return report(result);
      }

      const resultNodes: Position[] | null = [];
      const data = target;
      const start = data.shift();
      const end = data.pop();

      if (start !== undefined && end !== undefined) {
        let cur = start;
        for (const next of data) {
          const part = await astar.Astar(conn, cur, next, passPoints);
          console.log(part);
          if (part === null) {
            result.reason =
              "Destination " +
              (data.indexOf(next) + 2) +
              " could not be reached.";
          } else {
            part.pop();
            for (const points of part) {
              resultNodes.push(points);
            }
            cur = next;
          }
        }
        const last = await astar.Astar(conn, cur, end, passPoints);

        if (last === null) {
          result.reason =
            "Destination " + (data.indexOf(cur) + 2) + " could not be reached.";
        } else {
          for (const points of last) {
            resultNodes.push(points);
          }
        }
      }
      result.succeeded = true;
      result.route = resultNodes;
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

export default express.Router().post("/astar", async (req, res) => {
  try {
    res.json(await createRoute(req.body.userId, req.body.data)); // FIXME
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
