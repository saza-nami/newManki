import mysql from "mysql2/promise";
import { PassablePoint, Position } from "../../types";
import * as dirdist from "./dirdist";
import * as db from "../../database";

/** 地点探索距離[m] */
const distance = 1;
/** 通行可能判定を行う地点間の間隔 distance * dt */
const dt = 1 / 10;

/* databaseから通行可能領域点群を取得 */
async function getPassPos(
  connected: mysql.PoolConnection
): Promise<PassablePoint[]> {
  const result: PassablePoint[] = [];

  const isPassable = db.extractElems(
    await db.executeTran(
      connected,
      "SELECT radius, lat, lng from passableTable"
    )
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

async function getAllPassPos(
  connected: mysql.PoolConnection
): Promise<PassablePoint[]> {
  const result: PassablePoint[] = [];

  const isPassable = db.extractElems(
    await db.executeTran(
      connected,
      "SELECT radius, lat, lng from passableTable LOCK IN SHARE MODE"
    )
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
function reachIn(p: Position, q: Position, passPos: PassablePoint[]): boolean {
  const dis = dirdist.distanceTo(p, q);
  if (dis > distance && !approx(dis, distance)) return false;
  if (!isReachable(p, q, passPos)) return false;
  return true;
}

/** 到達可能判定 */
function isReachable(
  p: Position,
  q: Position,
  passPos: PassablePoint[]
): boolean {
  for (let t = 0; t <= 1; t += dt) {
    const middle: Position = {
      lat: (q.lat - p.lat) * t + p.lat,
      lng: (q.lng - p.lng) * t + p.lng,
    };
    if (!isPassable(middle, passPos)) return false;
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
  getAllPassPos,
  distance,
};
