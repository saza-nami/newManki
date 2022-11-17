import { Position } from "../../types";
/**
 * 距離を求める関数の一覧
 */

// ユークリッド距離 (直線距離)
const euclidean = (p: Position, q: Position) =>
  Math.hypot(q.lat - p.lat, q.lng - p.lng);

// マンハッタン距離 (飛車の総移動距離)
const manhattan = (p: Position, q: Position) =>
  Math.abs(q.lat - p.lat) + Math.abs(q.lng - p.lng);

// チェビシェフ距離 (王将の総移動距離)
const chebychev = (p: Position, q: Position) =>
  Math.max(Math.abs(q.lat - p.lat), Math.abs(q.lng - p.lng));

// 直線距離の二乗
const euclidean2 = (p: Position, q: Position) =>
  (q.lat - p.lat) ** 2 + (q.lng - p.lng) ** 2;

export { euclidean, manhattan, chebychev, euclidean2 };
