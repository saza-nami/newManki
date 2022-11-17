import mysql from "mysql2/promise";
import { Position, PassablePoint, AllocatedCar, proceed } from "../../types";
import * as db from "../../database";
import * as astar from "./notNotAstar";
import * as map from "./map";

export async function unallocateCarTran(): Promise<boolean> {
  let allocFlag: boolean = false;
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    const passPoints: PassablePoint[] = await map.getAllPassPos(conn);
    let tmpAstar: Position[] | null = [];
    // 命令受理済みで車未割当のユーザの orderId を取得
    const order = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT orderId FROM userTable \
        WHERE carId IS NULL AND orderId IS NOT NULL LOCK IN SHARE MODE"
      )
    );
    const car = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, nowPoint, battery FROM carTable \
        WHERE status = 1 LOCK IN SHARE MODE"
      )
    );
    if (order !== undefined && car !== undefined) {
      // 未割当の命令分ループ
      for (const orderId of order) {
        if ("orderId" in orderId) {
          const route = db.extractElem(
            await db.executeTran(
              conn,
              "SELECT route FROM orderTable \
              WHERE orderId = ? LOCK IN SHARE MODE",
              [orderId["orderId"]]
            )
          );
          if (route !== undefined && "route" in route) {
            // 空いている車分ループ
            for (const carId of car) {
              if ("carId" in carId && "nowPoint" in carId) {
                tmpAstar = await astar.Astar(
                  conn,
                  carId["nowPoint"],
                  route["route"][0][0],
                  passPoints
                );
                if (tmpAstar !== null) {
                  await db.executeTran(
                    conn,
                    "UPDATE carTable SET status = 3 \
                    WHERE carId = ? LOCK IN SHARE MODE",
                    [carId["carId"]]
                  );
                  await db.executeTran(
                    conn,
                    "UPDATE orderTable SET nextPoint = ?, arrival = FALSE, \
                    finish = FAlSE, carToRoute = ?, \
                    pRoute = 0, pPoint = 0 WHERE orderId = ? \
                    LOCK IN SHARE MODE",
                    [tmpAstar[0], tmpAstar, orderId["orderId"]]
                  );
                  await db.executeTran(
                    conn,
                    "UPDATE userTable SET carId = ? \
                    WHERE orderId = ? LOCK IN SHARE MODE",
                    [carId["carId"], orderId["orderId"]]
                  );
                  allocFlag = true;
                }
              }
              if (allocFlag) break;
            }
          }
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return allocFlag;
}

export async function allocatedCarTran(): Promise<boolean> {
  let allocFlag: boolean = false;
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    const passPoints: PassablePoint[] = await map.getAllPassPos(conn);
    let tmpAstar: Position[] | null = [];
    // 車が割当て済みで status が 2 かつ命令が終了していないユーザの orderId を取得
    const canditateAlloc = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, orderId FROM userTable \
        WHERE carId IS NOT NULL AND orderId IS NOT NULL LOCK IN SHARE MODE"
      )
    );
    const order: AllocatedCar[] = []; // 車を割り当てなければいけない命令群
    if (canditateAlloc !== undefined) {
      // 命令候補分ループ
      for (const alloc of canditateAlloc) {
        if ("carId" in alloc && "orderId" in alloc) {
          const car = db.extractElem(
            await db.executeTran(
              conn,
              "SELECT nowPoint, status FROM carTable \
              WHERE carId = ? LOCK IN SHARE MODE",
              [alloc["carId"]]
            )
          );
          const endAt = db.extractElem(
            await conn.execute(
              "SELECT endAt FROM orderTable \
              WHERE orderId = ? LOCK IN SHARE MODE",
              [alloc["orderId"]]
            )
          );
          if (car !== undefined && endAt !== undefined) {
            if (
              "status" in car &&
              car["status"] === 2 &&
              "nowPoint" in car &&
              "endAt" in endAt &&
              endAt["endAt"] === null
            ) {
              order.push({
                orderId: alloc["orderId"],
                carId: alloc["carId"],
                nowPoint: car["nowPoint"],
              });
            }
          }
        }
      }
    } // 割り当てる命令確定

    // 命令分ループ
    for (const realloc of order) {
      allocFlag = false;
      const route = db.extractElem(
        await db.executeTran(
          conn,
          "SELECT route FROM orderTable WHERE orderId = ? LOCK IN SHARE MODE",
          [realloc.orderId]
        )
      );
      if (route !== undefined) {
        if ("route" in route) {
          console.log(route["route"][0][0]);
          tmpAstar = await astar.Astar(
            conn,
            realloc.nowPoint,
            route["route"][0][0],
            passPoints
          );
          if (tmpAstar !== null) {
            await db.executeTran(
              conn,
              "UPDATE carTable SET status = 3 \
              WHERE carId = ? LOCK IN SHARE MODE",
              [realloc.carId]
            );
            await db.executeTran(
              conn,
              "UPDATE orderTable SET nextPoint = ?, arrival = FALSE, \
              finish = FAlSE, carToRoute = ?, \
              pRoute = 0, pPoint = 0 WHERE orderId = ? \
              LOCK IN SHARE MODE",
              [tmpAstar[0], tmpAstar, realloc.orderId]
            );
            await db.executeTran(
              conn,
              "UPDATE userTable SET carId = ? \
              WHERE orderId = ? LOCK IN SHARE MODE",
              [realloc.carId, realloc.orderId]
            );
            allocFlag = true;
          }
        }
      }

      // 現在割り当てられている車が命令を実行できない場合
      if (!allocFlag) {
        const car = db.extractElems(
          await db.executeTran(
            conn,
            "SELECT carId, nowPoint, battery FROM carTable \
            WHERE status = 1 LOCK IN SHARE MODE"
          )
        );
        if (route !== undefined && car !== undefined) {
          for (const carId of car) {
            if ("route" in route && "carId" in carId && "nowPoint" in carId) {
              tmpAstar = await astar.Astar(
                conn,
                carId["nowPoint"],
                route["route"][0][0],
                passPoints
              );
              if (tmpAstar !== null) {
                await db.executeTran(
                  conn,
                  "UPDATE carTable SET status = 3 \
                  WHERE carId = ? LOCK IN SHARE MODE",
                  [carId["carId"]]
                );
                await db.executeTran(
                  conn,
                  "UPDATE carTable SET status = 1 \
                  WHERE carId = ? LOCK IN SHARE MODE",
                  [realloc.carId]
                );
                await db.executeTran(
                  conn,
                  "UPDATE orderTable SET nextPoint = ?, arrival = FALSE, \
                  finish = FAlSE, carToRoute = ? \
                  pRoute = 0, pPoint = 0 WHERE orderId = ? \
                  LOCK IN SHARE MODE",
                  [tmpAstar[0], tmpAstar, realloc.orderId]
                );
                await db.executeTran(
                  conn,
                  "UPDATE userTable SET carId = ? \
                  WHERE orderId = ? LOCK IN SHARE MODE",
                  [carId["carId"], realloc.orderId]
                );
                allocFlag = true;
              }
            }
            if (allocFlag) break;
          }
        }
      }
    }

    await conn.commit();
    return allocFlag;
  } catch (err) {
    await conn.rollback();
    console.log(err);
    return false;
  } finally {
    conn.release();
  }
}

export async function progressTran(
  carId: string
): Promise<Position | undefined> {
  const conn = await mysql.createConnection(db.CONNECTION_OPTIONS);
  let nextPosition: Position | undefined = undefined;
  try {
    await conn.beginTransaction();
    // carId から車を進ませるのに必要な情報を取得
    const getOrderIdSql =
      "SELECT orderId FROM userTable WHERE carId = UUID_TO_BIN(?, 1) AND endAt IS NULL";
    const getStatusSql =
      "SELECT status, sequence FROM carTable WHERE carId = UUID_TO_BIN(?, 1)";
    const userTable = await conn.execute(getOrderIdSql, [carId]);
    let orderId: number = 0;
    if (Array.isArray(userTable) && Array.isArray(userTable[0])) {
      if ("orderId" in userTable[0][0]) {
        orderId = userTable[0][0]["orderId"];
      } else {
        await conn.commit();
        return nextPosition;
      }
    }

    const carTable = await db.execute(getStatusSql, [carId]);
    let status: number = 0;
    if (Array.isArray(carTable) && Array.isArray(carTable[0])) {
      if ("status" in carTable[0][0]) {
        status = carTable[0][0]["status"];
      } else {
        await conn.commit();
        return nextPosition;
      }
    }
    const getParamsSql =
      "SELECT nextPoint, arrival, finish, arrange, carToRoute, route, junkai, pRoute, pPoint FROM orderTable WHERE orderId = ?";
    const orderTable = await db.execute(getParamsSql, [orderId]);
    let param: proceed;
    if (Array.isArray(orderTable) && Array.isArray(orderTable[0])) {
      if (
        "nextPoint" in orderTable[0][0] &&
        "arrival" in orderTable[0][0] &&
        "finish" in orderTable[0][0] &&
        "arrange" in orderTable[0][0] &&
        "carToRoute" in orderTable[0][0] &&
        "route" in orderTable[0][0] &&
        "junkai" in orderTable[0][0] &&
        "pRoute" in orderTable[0][0] &&
        "pPoint" in orderTable[0][0]
      ) {
        param = {
          nextPoint: orderTable[0][0]["nextPoint"],
          arrival: orderTable[0][0]["arrival"] ? true : false,
          finish: orderTable[0][0]["finish"] ? true : false,
          arrange: orderTable[0][0]["arrange"] ? true : false,
          carToRoute: orderTable[0][0]["carToRoute"],
          route: orderTable[0][0]["route"],
          junkai: orderTable[0][0]["junkai"] ? true : false,
          pRoute: orderTable[0][0]["pRoute"],
          pPoint: orderTable[0][0]["pPoint"],
        };
        // 車が走行中で停留所に目的地にもいない場合
        if (status === 3 && !param.arrival && !param.finish) {
          // 車が経路の始点に向かっている時
          if (!param.arrange) {
            // 車が経路の始点についたら
            if (param.carToRoute.length - 1 === param.pPoint) {
              await db.execute(
                "UPDATE orderTable SET arrival = TRUE, arrange = TRUE, pRoute = 1, pPoint = 0, nextPoint = ? WHERE orderId = ?",
                [param.route[0][0], orderId]
              );
              await db.execute(
                "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)",
                [carId]
              );
            }
            // 車が経路の始点まで移動中なら
            else if (param.carToRoute.length - 1 > param.pPoint) {
              console.log("go to arrange position");
              await db.execute(
                "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 WHERE orderId = ?",
                [param.carToRoute[param.pPoint + 1], orderId]
              );
            }
          }
          // 車が経路の始点についた後
          else {
            // 目的地についたら
            if (
              param.route === undefined ||
              param.route[param.pRoute - 1] === undefined
            ) {
              await conn.commit();
              return nextPosition;
            } else if (
              param.route.length - 1 === param.pRoute &&
              param.route[param.pRoute - 1].length - 1 === param.pPoint
            ) {
              // 巡回する場合
              if (param.junkai) {
                await db.execute(
                  "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, pRoute = 1, pPoint = 0 WHERE orderId = ?",
                  [param.route[0][0], orderId]
                );
              }
              // 巡回しない場合
              else {
                await db.execute(
                  "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, finish = TRUE WHERE orderId = ?",
                  [orderId]
                );
                await db.execute(
                  "UPDATE carTable SET status = 2 WHERE carId = UUID_TO_BIN(?, 1)",
                  [carId]
                );
              }
            }
            // 停留所についたら
            else if (
              param.route[param.pRoute - 1].length - 1 ===
              param.pPoint
            ) {
              await db.execute(
                "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, pRoute = pRoute + 1, pPoint = 0 WHERE orderId = ?",
                [param.route[param.pRoute][0], orderId]
              );
              await db.execute(
                "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)",
                [carId]
              );
            }
            // 経路間移動中なら
            else {
              await db.execute(
                "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 WHERE orderId = ?",
                [param.route[param.pRoute - 1][param.pPoint], orderId]
              );
            }
          }
          nextPosition = param.nextPoint;
        }
      }
    }
    await conn.commit();
    return nextPosition;
  } catch (err) {
    await conn.rollback();
    console.log(err);
    return undefined;
  } finally {
    await conn.end();
  }
}

// export const systemLoop = () => {
//   return new Promise(() => {
//     setInterval(async () => {
//       report(await unallocateCarTran());
//       report(await allocatedCarTran());
//     }, 5000);
//   });
// };
