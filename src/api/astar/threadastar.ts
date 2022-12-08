/* 経路探索API */

import express from "express";
import { Worker } from "worker_threads";
import { ApiResult, Position, PassablePoint } from "../../types";
import * as db from "../../database";
import * as global from "../scripts/global";
import * as map from "../scripts/map";
import report from "../_report";

interface CreateRoute extends ApiResult {
  route?: Position[] | null;
  reason?: string;
}

const lockTablesSql = "LOCK TABLES userTable WRITE, passableTable READ";
const unlockTablesSql = "UNLOCK TABLES";

async function task(res: express.Response) {
  const result: ApiResult = { succeeded: false };
  const worker1 = new Worker("./src/worker.js", {
    workerData: { timer: "worker1" },
  });
  Promise.all([new Promise((r) => worker1.on("exit", r))]).then((r) => {
    result.succeeded = true;
    res.json(result);
    report(result);
  });
}

async function createRoute(
  userId: string,
  target: Position[],
  res: express.Response
) {
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

  const workerAstar = new Worker("./src/api/astar/workerrouter.js", {
    workerData: { target: target, passPoints: passPoints },
  });
  Promise.all([
    new Promise((r) => workerAstar.on("message", (message) => r(message))),
    new Promise((r) => workerAstar.on("exit", r)),
  ]).then((r) => {
    res.json(r[0]);
    report(r[0]);
  });
}

export default express.Router().post("/threadAstar", async (req, res) => {
  try {
    await createRoute(req.body.userId, req.body.data, res);
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
