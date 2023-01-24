import { Position, Node, PassablePoint } from "types";

import * as map from "api/scripts/map";
import * as dirdist from "api/scripts/dirdist";

/** 経路探索 */
function Astar(
  start: Position,
  goal: Position,
  passPoints: PassablePoint[]
): Position[] | null {
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
      const nodesLength = nodes.length;
      for (const n of newNodes) {
        let flag = true;
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
          // ゴール到達可能かつ候補点の中で最適か
          if (
            map.reachIn(node.position, goal, passPoints) &&
            node.gCost + dirdist.distanceTo(node.position, goal) <
              goalNode.gCost
          ) {
            goalNode = {
              position: goal,
              gCost: node.gCost + dirdist.distanceTo(node.position, goal),
              hCost: 0,
              comfirm: true,
              parent: nodes.length,
            };
          } else {
            // 評価済み地点重複確認
            for (let i = 0; i < nodesLength; i++) {
              if (map.approx(node.position, nodes[i].position)) {
                if (node.gCost < nodes[i].gCost) {
                  if (nodes[i].comfirm) node.comfirm = true;
                  nodes[i] = node;
                }
                flag = false;
                break;
              }
            }
          }
          // 評価済み地点未重複の場合
          if (flag) nodes.push(node);
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
  return optimization(result, passPoints);
}

/* 経路探索 (Mandelbrot2)*/
async function manAstar(
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
  let foo = 0;

  while (goalNode.parent === null) {
    const minIndex = getMinIndex(nodes);
    if (minIndex != -1) {
      nodes[minIndex].comfirm = true;
      const newNodes = map.addNode(nodes[minIndex].position);
      const nodesLength = nodes.length;
      for (const n of newNodes) {
        let flag = true;
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
          // ゴール到達可能かつ候補点の中で最適か
          if (
            map.reachIn(node.position, goal, passPoints) &&
            node.gCost + dirdist.distanceTo(node.position, goal) <
              goalNode.gCost
          ) {
            goalNode = {
              position: goal,
              gCost: node.gCost + dirdist.distanceTo(node.position, goal),
              hCost: 0,
              comfirm: true,
              parent: nodes.length,
            };
          } else {
            // 評価済み地点重複確認
            for (let i = 0; i < nodesLength; i++) {
              if (map.approx(node.position, nodes[i].position)) {
                if (node.gCost < nodes[i].gCost) {
                  if (nodes[i].comfirm) node.comfirm = true;
                  nodes[i] = node;
                }
                flag = false;
                break;
              }
            }
          }
          // 評価済み地点未重複の場合
          if (flag) nodes.push(node);
        }
        foo++;
        if (foo % 7 === 0) {
          await new Promise<void>((r) => setTimeout(() => r(), 0));
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
  return optimization(result, passPoints);
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
