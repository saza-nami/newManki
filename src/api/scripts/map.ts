import { NodeInfo, PassablePoint, Position } from "types";

import * as dirdist from "api/scripts/dirdist";

/** 経路、ルート判定結果 */
interface CheckResult {
  available: boolean;
  reason?: {
    route: number;
    pos: number;
  };
}

/** 地点探索距離[m] */
const stanDistance = 1;
/** 地点生成分解能 */
const resolution = 360 / 8;
/** 同一地点判定距離 */
const identDistance =
  stanDistance * Math.cos((90 - resolution / 2) * (Math.PI / 180));

/** 隣接地点生成 */
function addNode(p: Position): Position[] {
  const nodes: Position[] = [];
  for (let i = 0; i < 360; i += resolution) {
    nodes.push(dirdist.moveBy(p, stanDistance, i));
  }
  return nodes;
}

/** 同一地点判定 */
function approx(A: Position, B: Position): boolean {
  const distance = dirdist.distanceTo(A, B);
  if (distance < identDistance) return true;
  return false;
}

/** 経路、ルート通行可能判定 */
function checkRoute(
  route: Position[][],
  passPoints: PassablePoint[]
): CheckResult {
  for (let i = 0; i < route.length; i++) {
    for (let j = 0; j < route[i].length - 1; j++) {
      if (!isReachable(route[i][j], route[i][j + 1], passPoints)) {
        return {
          available: false,
          reason: {
            route: i,
            pos: j,
          },
        };
      }
    }
    if (route.length - i > 1) {
      if (
        !isReachable(route[i][route[i].length - 1], route[i + 1][0], passPoints)
      ) {
        return {
          available: false,
          reason: {
            route: i,
            pos: route[i].length - 1,
          },
        };
      }
    }
  }
  return { available: true };
}

/** 隣接地点情報生成 */
function createNodeInfo(
  parent: NodeInfo,
  parentNo: number,
  goal: Position,
  passPoint: PassablePoint[]
): NodeInfo[] {
  const nexts = addNode(parent.position);
  const nodes: NodeInfo[] = [];
  for (const n of nexts) {
    if (reachIn(parent.position, n, passPoint))
      nodes.push({
        position: n,
        gCost: parent.gCost + dirdist.distanceTo(parent.position, n),
        hCost: dirdist.distanceTo(n, goal),
        comfirm: false,
        parent: parentNo,
      });
  }
  return nodes;
}

/** 探索距離内通行可能判定 */
function reachIn(
  p: Position,
  q: Position,
  passPoints: PassablePoint[]
): boolean {
  const distance = dirdist.distanceTo(p, q);
  if (distance > stanDistance) return false;
  if (!isReachable(p, q, passPoints)) return false;
  return true;
}

/** 地点有効判定 */
function isPassable(p: Position, passPoints: PassablePoint[]): boolean {
  for (const elem of passPoints) {
    const distance = dirdist.distanceTo(p, elem.position);
    if (elem.radius >= distance) return true;
  }
  return false;
}

/** 地点間通行可能判定 */
function isReachable(
  p: Position,
  q: Position,
  passPoints: PassablePoint[]
): boolean {
  const dt = 0.1;
  const distance = dirdist.distanceTo(p, q);
  const div = Math.round(distance * 100) / 10;
  const direction = dirdist.direction(p, q);
  for (let t = 0; t <= div; t++) {
    const middle = dirdist.moveBy(p, t * dt, direction);
    if (!isPassable(middle, passPoints)) return false;
  }
  return true;
}

export {
  addNode,
  approx,
  checkRoute,
  createNodeInfo,
  reachIn,
  isPassable,
  isReachable,
};
