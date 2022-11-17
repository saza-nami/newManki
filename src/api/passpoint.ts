// 通行可能領域登録 API

import express from "express";
import { ApiResult, PassablePoint } from "../types";
import * as db from "../database";
import report from "./_report";

const addPassableSql =
  "INSERT INTO passableTable(radius, lat, lng) VALUES(?, ?, ?)";

async function addPassable(passPoints: PassablePoint[]): Promise<ApiResult> {
  const result: ApiResult = { succeeded: true };
  // 入力チェック
  if (typeof passPoints === "undefined") {
    return report(result);
  }

  const add = passPoints;
  console.log(add);
  for (const i in add) {
    console.log(add[i]);
    await db.execute(addPassableSql, [
      add[i].radius,
      add[i].position.lat,
      add[i].position.lng,
    ]);
  }
  return report(result);
}

export default express.Router().post("/addPassable", async (req, res) => {
  try {
    res.json(await addPassable(req.body.data));
  } catch (err) {
    res.status(500).json({ succeeded: false, reason: err });
  }
});
