/* 経路探索API */

import express from "express";
import { ApiResult, Position, PassablePoint } from "types";
import * as astar from "api/scripts/notNotAstar";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

interface CreateRoute extends ApiResult {
  route?: Position[];
  reason?: string;
}

async function createRoute(
  userId: string,
  target: Position[]
): Promise<CreateRoute> {
  const result: CreateRoute = { succeeded: false };
  let passPoints: PassablePoint[] = [];
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      passPoints = await map.getPassPos(conn);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }

  if (passPoints.length > 0) {
    let point = 0;
    for (const t of target) {
      point++;
      if (!map.isPassable(t, passPoints)) {
        result.reason =
          "Destination " + point + " is outside the passable area.";
        return report(result);
      }
    }

    const resultNodes: Position[] = [];
    const data = target;
    const start = data.shift();
    const end = data.pop();

    if (start !== undefined && end !== undefined) {
      let cur = start;
      for (const next of data) {
        const part = await astar.manAstar(cur, next, passPoints);
        if (part === null) {
          result.reason =
            "Destination " +
            (data.indexOf(next) + 2) +
            " could not be reached.";
          return report(result);
        } else {
          part.pop();
          for (const points of part) {
            resultNodes.push(points);
          }
          cur = next;
        }
      }
      const last = await astar.manAstar(cur, end, passPoints);
      if (last === null) {
        result.reason = "The end point could not be reached.";
      } else {
        for (const points of last) {
          resultNodes.push(points);
        }
      }
    }
    result.succeeded = true;
    result.route = resultNodes;
  } else {
    result.reason = "Illegal user.";
  }
  return report(result);
}

export default express.Router().post("/astar", async (req, res) => {
  try {
    if (
      typeof req.body.userId === "undefined" ||
      typeof req.body.data === "undefined" ||
      req.body.data.length < 2
    ) {
      res.json({ succeeded: false, reason: "Invalid request." });
    } else {
      res.json(await createRoute(req.body.userId, req.body.data));
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
