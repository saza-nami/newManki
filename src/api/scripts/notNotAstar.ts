import mysql from "mysql2/promise";
import { Position, Node, PassablePoint } from "../../types";
import * as map from "./map";
import * as dirdist from "./dirdist";

/** 経路探索 */
async function Astar(
  connected: mysql.PoolConnection,
  start: Position,
  goal: Position,
  passPoints: PassablePoint[]
): Promise<Position[] | null> {
  let goalNode: Node = {
    position: goal,
    gCost: Number.MAX_VALUE,
    hCost: dirdist.distanceTo(start, goal),
    comfirm: false,
    parent: null,
  };
  const nodes: Node[] = [
    {
      position: start,
      gCost: 0,
      hCost: dirdist.distanceTo(start, goal),
      comfirm: false,
      parent: null,
    },
  ];

  while (goalNode.parent === null) {
    const minIndex = getMinIndex(nodes);
    if (minIndex != -1) {
      nodes[minIndex].comfirm = true;
      const newNodes = map.addNode(nodes[minIndex].position);
      for (const n of newNodes) {
        let flag = false;
        if (map.reachIn(nodes[minIndex].position, n, passPoints)) {
          const node: Node = {
            position: n,
            gCost:
              nodes[minIndex].gCost +
              dirdist.distanceTo(nodes[minIndex].position, n),
            hCost: dirdist.distanceTo(n, goal),
            comfirm: false,
            parent: minIndex,
          };
          if (
            map.reachIn(node.position, goal, passPoints) &&
            dirdist.distanceTo(node.position, goal) < goalNode.gCost
          ) {
            goalNode = {
              position: goal,
              gCost: node.gCost + dirdist.distanceTo(node.position, goal),
              hCost: 0,
              comfirm: true,
              parent: nodes.length,
            };
            nodes.push(node);
          } else {
            // 評価済み地点重複確認
            for (let i = 0; i < nodes.length; i++) {
              if (
                map.approx(node.position.lat, nodes[i].position.lat) &&
                map.approx(node.position.lng, nodes[i].position.lng)
              ) {
                if (node.gCost < nodes[i].gCost) {
                  if (nodes[i].comfirm) node.comfirm = true;
                  nodes[i] = node;
                }
                flag = true;
                break;
              }
            }
          }
          // 評価済み地点未重複の場合
          if (!flag) nodes.push(node);
        }
      }
    } else {
      return null;
    }
  }

  let childNode = goalNode;
  const result: Position[] = [];
  while (1) {
    result.unshift(childNode.position);
    if (childNode.parent === null) break;
    childNode = nodes[childNode.parent];
  }
  return await optimization(result, passPoints);
}

/** 地点群から未評価最小コスト地点の算出 */
function getMinIndex(nodes: Node[]): number {
  let minCost = Number.MAX_VALUE;
  let minIndex = 0;
  const length = nodes.length;
  for (let i = 0; i < length; i++) {
    const cost = nodes[i].gCost + nodes[i].hCost;
    if (minCost > cost && !nodes[i].comfirm) {
      minCost = cost;
      minIndex = i;
    }
  }
  if (minCost !== Number.MAX_VALUE) return minIndex;
  return -1;
}

/** 最適経路直線化 */
async function optimization(
  p: Position[],
  passPoints: PassablePoint[]
): Promise<Position[]> {
  const data: Position[] = [];
  data.push(p[0]);
  let i = 0;
  while (i < p.length) {
    for (let k = i + 1; k < p.length; k++) {
      if (k < p.length - 1) {
        if (!map.isReachable(p[i], p[k], passPoints)) {
          data.push(p[k - 1]);
          i = k;
          break;
        }
      } else {
        data.push(p[k]);
        i = Number.MAX_VALUE;
        break;
      }
    }
  }
  return data;
}

export { Astar };
