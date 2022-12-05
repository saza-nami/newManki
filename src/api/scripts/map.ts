import { PassablePoint, Position } from "../../types";

import * as db from "../../database";
import mysql from "mysql2/promise";
import * as dirdist from "./dirdist";

/** 地点探索距離[m] */
const stanDistance = 1;
/** 通行可能判定を行う地点間の間隔 dt[m] */
const dt = stanDistance / 10;
/** 通行可能領域との余裕[m] */
const margin = 0.3;
/** 地点生成分解能 */
const resolution = 18;

/* 経路の実行可能判定 */
function checkRoute(route: Position[][], passPoints: PassablePoint[]) {
  let result: boolean = true;
  for (let i = 0; i < route.length; i++) {
    for (let j = 0; j < route[i].length - 1; j++) {
      if (isReachable(route[i][j], route[i][j + 1], passPoints) === false) {
        result = false;
      }
      if (!result) {
        break;
      }
    }
    if (!result) {
      break;
    }
  }
  return result;
}

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

/** 評価候補のノード群を生成 */
function addNode(p: Position): Position[] {
  const nodes: Position[] = [];
  for (let i = 0; i < 360; i += 360 / resolution) {
    nodes.push(dirdist.moveBy(p, stanDistance, i));
  }
  return nodes;
}

// 同一地点判定
function approx(A: Position, B: Position): boolean {
  const distance = dirdist.distanceTo(A, B);
  if (distance < stanDistance / 2) return true;
  return false;
}

/** distanceの届く範囲内判定 */
function reachIn(
  p: Position,
  q: Position,
  passPoints: PassablePoint[],
  marginFlag?: boolean
): boolean {
  const distance = dirdist.distanceTo(p, q);
  if (distance > stanDistance) return false;
  if (!isReachable(p, q, passPoints, marginFlag)) return false;
  return true;
}

/** 到達可能判定 */
function isReachable(
  p: Position,
  q: Position,
  passPoints: PassablePoint[],
  marginFlag?: boolean
): boolean {
  if (approx(p, q)) isPassable(p, passPoints);
  const distance = dirdist.distanceTo(p, q);
  const interval = dt / distance;
  const direction = dirdist.direction(p, q);
  let middle: Position = p;
  for (let t = 0; t <= 1; t += interval) {
    middle = dirdist.moveBy(middle, dt, direction);
    if (!isPassable(middle, passPoints, marginFlag)) return false;
  }
  return true;
}

/** 通行可能判定 */
function isPassable(
  p: Position,
  passPoints: PassablePoint[],
  marginFlag?: boolean
): boolean {
  for (const elem of passPoints) {
    const distance = dirdist.distanceTo(p, elem.position);
    const radius = marginFlag ? distance + margin : distance;
    if (elem.radius > radius) return true;
  }
  return false;
}

export {
  checkRoute,
  getPassPos,
  addNode,
  approx,
  reachIn,
  isReachable,
  isPassable,
};
