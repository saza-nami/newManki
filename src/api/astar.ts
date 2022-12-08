/* 経路探索API */

import express from "express";
import { Worker } from "worker_threads";
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

const lockTablesSql = "LOCK TABLES userTable WRITE, passableTable READ";
const unlockTablesSql = "UNLOCK TABLES";

async function createRoute(
  userId: string,
  target: Position[]
): Promise<CreateRoute> {
  // return values of API
  const result: CreateRoute = { succeeded: false };
  let passPoints: PassablePoint[] = [];
  console.log(userId, target);
  // check input
  if (typeof userId === "undefined" || typeof target === "undefined") {
    return report(result);
  }
  if (target.length < 2) {
    console.log("targetlength");
    return report(result);
  }

  const conn = await db.createNewConn(); // database connection
  // begin transaction
  try {
    await conn.beginTransaction();
    await conn.query(lockTablesSql);

    console.log("query start");
    // check exist user
    if ((await global.existUserTran(conn, userId)) === true) {
      passPoints = await map.getPassPos(conn);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlockTablesSql);
    console.log("query end");
    conn.release();
  }

  for (const t of target) {
    if (!map.isPassable(t, passPoints)) {
      console.log(target[0], t);
      return report(result);
    }
  }

  const resultNodes: Position[] | null = [];
  const data = target;
  const start = data.shift();
  const end = data.pop();

  if (start !== undefined && end !== undefined) {
    let cur = start;
    for (const next of data) {
      const part = astar.Astar(cur, next, passPoints);

      /*
      let part: Position[] | null = [];

      const thread = new Worker(__dirname + "/worker.js", {
        workerData: { cur: cur, next: next, passPoints: passPoints },
      });
      thread.on("massage", (message: Position[] | null) => {
        part = message;
      });
      console.log("part");
      */

      if (part === null) {
        result.reason =
          "Destination " + (data.indexOf(next) + 2) + " could not be reached.";
        return report(result);
      } else {
        part.pop();
        for (const points of part) {
          resultNodes.push(points);
        }
        cur = next;
      }
    }
    const last = await astar.Astar(cur, end, passPoints);

    /*
    let last: Position[] | null = [];

    const thread2 = new Worker("./src/worker.js", {
      workerData: { cur: cur, next: end, passPoints: passPoints },
    });
    Promise.all([
      new Promise((r) => thread2.on("exit", r)),
      new Promise((r) =>
        thread2.on("message", async (message: Position[] | null) => {
          r(message);
        })
      ),
    ]).then((r) => {
      console.log(r[1]);
      last = r[1] as Position[];
    });
    */

    console.log("last" + last);

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
  /*
  if (map.checkRoute([resultNodes], passPoints)) {
    
  }
  */

  return report(result);
}

export default express.Router().post("/astar", async (req, res) => {
  try {
    res.json(await createRoute(req.body.userId, req.body.data)); // FIXME
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
