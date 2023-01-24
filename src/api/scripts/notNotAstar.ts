import { Position, NodeInfo, PassablePoint } from "types";

import * as map from "api/scripts/map";
import * as dirdist from "api/scripts/dirdist";

/** 経路探索 */
function Astar(
  start: Position,
  goal: Position,
  passPoints: PassablePoint[]
): Position[] | null {
  let goalInfo: NodeInfo = {
    position: goal,
    gCost: Number.MAX_VALUE,
    hCost: dirdist.distanceTo(start, goal),
    comfirm: false,
    parent: null,
  };
  const nodes: NodeInfo[] = [
    {
      position: start,
      gCost: 0,
      hCost: dirdist.distanceTo(start, goal),
      comfirm: false,
      parent: null,
    },
  ];

  while (goalInfo.parent === null) {
    const minIndex = getMinIndex(nodes);
    if (minIndex < 0) {
      // 探索失敗
      return null;
    } else {
      // 隣接地点生成
      nodes[minIndex].comfirm = true;
      const nextNodes: (NodeInfo | false)[] = map.createNodeInfo(
        nodes[minIndex],
        minIndex,
        goal,
        passPoints
      );

      let reachInfo: NodeInfo | false = false;
      nextNodes.forEach((next) => {
        if (next != false) {
          if (map.reachIn(next.position, goal, passPoints)) {
            const f = next.gCost + dirdist.distanceTo(next.position, goal);
            if (goalInfo.gCost > f) {
              reachInfo = next;
              goalInfo.gCost = f;
            }
          }
        }
      });

      if (reachInfo) {
        // 探索終了
        goalInfo.parent = nodes.length;
        nodes.push(reachInfo);
        break;
      } else {
        // 同一地点処理
        nodes.forEach((node, nodeIndex) => {
          nextNodes.forEach((next, nextIndex) => {
            if (next != false && map.approx(node.position, next.position)) {
              if (node.gCost > next.gCost) {
                next.comfirm = node.comfirm;
                nodes[nodeIndex] = next;
              }
              nextNodes[nextIndex] = false;
            }
          });
        });
        nextNodes.forEach((next) => {
          if (next != false) nodes.push(next);
        });
      }
    }
  }

  let childNode = goalInfo;
  const result: Position[] = [];
  while (1) {
    result.unshift(childNode.position);
    if (childNode.parent === null) break;
    childNode = nodes[childNode.parent];
  }
  return optimization(result, passPoints);
}

/* 経路探索 (Mandelbrot2)*/
async function manAstar(
  start: Position,
  goal: Position,
  passPoints: PassablePoint[]
): Promise<Position[] | null> {
  const result = Astar(start, goal, passPoints);
  await new Promise<void>((r) => setTimeout(() => r(), 0));
  return result;
}

// 評価済みノード群から最小コストノードの算出
function getMinIndex(nodes: NodeInfo[]): number {
  let minCost = Number.MAX_VALUE;
  let minIndex = -1;
  nodes.forEach((node, index) => {
    if (!node.comfirm) {
      const cost = node.gCost + node.hCost;
      if (minCost > cost) {
        minCost = cost;
        minIndex = index;
      }
    }
  });
  return minIndex;
}

/** 最適経路直線化 */
function optimization(p: Position[], passPoints: PassablePoint[]): Position[] {
  const data: Position[] = [];
  data.push(p[0]);
  for (let i = 0; i < p.length - 2; i) {
    for (let j = p.length - 1; i < j; j--) {
      if (map.isReachable(p[i], p[j], passPoints)) {
        data.push(p[j]);
        i = j;
      }
    }
  }
  return data;
}

export { manAstar, Astar };
