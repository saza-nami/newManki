import mysql from "mysql2/promise";
import { PassablePoint, Position } from "../../types";
import * as dirdist from "./dirdist";
import * as db from "../../database";

/** 地点探索距離[m] */
const distance = 1;
/** 通行可能判定を行う地点間の間隔 dt[m] */
const dt = 1 / 10;

/* databaseから通行可能領域点群を取得 */
async function getPassPos(
  connected: mysql.PoolConnection
): Promise<PassablePoint[]> {
  const result: PassablePoint[] = [];
  const passableSql =
    "SELECT radius, lat, lng from passableTable LOCK IN SHARE MODE";
  const isPassable = db.extractElems(
    await db.executeTran(connected, passableSql)
  );
  if (isPassable !== undefined) {
    for (const elem of isPassable) {
      if ("radius" in elem && "lat" in elem && "lng" in elem) {
        result.push({
          position: { lat: Number(elem["lat"]), lng: Number(elem["lng"]) },
          radius: Number(elem["radius"]),
        });
      }
    }
  }
  return result;
}

/** distanceの届く範囲内判定 */
function reachIn(
  p: Position,
  q: Position,
  passPoints: PassablePoint[]
): boolean {
  const dis = dirdist.distanceTo(p, q);
  if (dis > distance && !approx(dis, distance)) return false;
  if (!isReachable(p, q, passPoints)) return false;
  return true;
}

/** 到達可能判定 */
function isReachable(
  p: Position,
  q: Position,
  passPoints: PassablePoint[]
): boolean {
  const interval = dt / Math.round(dirdist.distanceTo(p, q));
  const direction = dirdist.direction(p, q);
  let middle: Position = p;
  for (let t = 0; t <= 1; t += interval) {
    middle = dirdist.moveBy(middle, t, direction);
    if (!isPassable(middle, passPoints)) return false;
  }
  return true;
}

/** 通行可能判定 */
function isPassable(p: Position, passPoints: PassablePoint[]): boolean {
  for (const elem of passPoints) {
    if (elem.radius > dirdist.distanceTo(p, elem.position)) {
      return true;
    }
  }
  return false;
}

/** 評価候補のノード群を生成 */
function addNode(p: Position): Position[] {
  const nodes: Position[] = [];
  for (let i = 0; i < 360; i += 360 / 18) {
    nodes.push(dirdist.moveBy(p, distance, i));
  }
  return nodes;
}

// 近似値判定
function approx(A: number, B: number): boolean {
  const n = Math.abs(A - B);
  // 約0.5mの誤差許容
  if (n < 0.000005) return true;
  return false;
}

export {
  addNode,
  approx,
  isPassable,
  isReachable,
  reachIn,
  getPassPos,
  distance,
};
