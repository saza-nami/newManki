import { parentPort, workerData } from "worker_threads";
import { ApiResult, PassablePoint, Position } from "types";
import * as astar from "api/scripts/notNotAstar";
import * as map from "api/scripts/map";
import report from "api/_report";

interface CreateRoute extends ApiResult {
  route?: Position[];
  reason?: string;
}

function thAstar(target: Position[], passPoints: PassablePoint[]): CreateRoute {
  const result: CreateRoute = { succeeded: false };
  for (const t of target) {
    if (!map.isPassable(t, passPoints)) {
      console.log(target[0], t);
      return report(result);
    }
  }

  const resultNodes: Position[] = [];
  const data = target;
  const start = data.shift();
  const end = data.pop();

  if (start !== undefined && end !== undefined) {
    let cur = start;
    for (const next of data) {
      const part = astar.Astar(cur, next, passPoints);
      if (part === null) {
        result.reason =
          "Destination " + (data.indexOf(next) + 2) + " could not be reached.";
        return report(result);
      } else {
        part.pop();
        for (const points of part) {
          resultNodes.push(points);
        }
        cur = next;
      }
    }
    const last = astar.Astar(cur, end, passPoints);
    if (last === null) {
      result.reason =
        "Destination " + (data.indexOf(cur) + 2) + " could not be reached.";
    } else {
      for (const points of last) {
        resultNodes.push(points);
      }
    }
  }
  result.succeeded = true;
  result.route = resultNodes;
  return report(result);
}

const result = thAstar(workerData.target, workerData.passPoints);
parentPort?.postMessage(result);
