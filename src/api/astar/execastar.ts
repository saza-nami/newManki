/* 経路探索API */

import express from "express";
import { Worker } from "worker_threads";
import { ApiResult, Position, PassablePoint } from "types";
import * as db from "database";
import * as global from "api/scripts/global";
import * as map from "api/scripts/map";
import report from "api/_report";

async function createRoute(
  userId: string,
  target: Position[],
  res: express.Response
) {
  const result: ApiResult = { succeeded: false };
  let passPoints: PassablePoint[] = [];
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    if ((await global.existUserTran(conn, userId)) === true) {
      passPoints = await map.getPassPos(conn);
    } else {
      result.reason = "Illegal user.";
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err instanceof Error) {
      result.reason = err.message;
    }
    console.log(err);
  } finally {
    conn.release();
  }

  if (result.reason === "Illegal user.") {
    res.json(result);
  }
  if (passPoints.length > 0) {
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
  } else {
    result.reason = "passablePoint does not exist.";
    res.json(result);
  }
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
      await createRoute(req.body.userId, req.body.data, res);
    }
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
