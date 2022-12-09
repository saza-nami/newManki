import mysql from "mysql2/promise";
import { Position, PassablePoint, AllocatedCar, proceed } from "../../types";
import * as astar from "./notNotAstar";
import * as db from "../../database";
import * as map from "./map";

// car allocate
export async function unallocateCarTran(): Promise<boolean> {
  let allocFlag: boolean = false;

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    const passPoints: PassablePoint[] = await map.getPassPos(conn);
    let tmpAstar: Position[] | null = [];
    // 命令受理済みで車未割当かつ終了していないユーザの orderId を取得
    const order = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT orderId FROM userTable \
        WHERE carId IS NULL AND orderId IS NOT NULL \
        AND endAt IS NULL LOCK IN SHARE MODE"
      )
    );
    const car = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, nowPoint, battery FROM carTable \
        WHERE status = 1 AND battery >= 30 LOCK IN SHARE MODE"
      )
    );
    if (order !== undefined && car !== undefined) {
      // 未割当の命令分ループ
      for (const orderId of order) {
        if ("orderId" in orderId && orderId["orderId"] !== undefined) {
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
                  carId["nowPoint"],
                  route["route"][0][0],
                  passPoints
                );
                if (tmpAstar !== null) {
                  await db.executeTran(
                    conn,
                    "UPDATE carTable SET status = 3 WHERE carId = ?",
                    [carId["carId"]]
                  );
                  await db.executeTran(
                    conn,
                    "UPDATE orderTable SET nextPoint = ?, arrival = FALSE, \
                    finish = FAlSE, carToRoute = ?, \
                    pRoute = 0, pPoint = 0 WHERE orderId = ?",
                    [tmpAstar[0], tmpAstar, orderId["orderId"]]
                  );
                  await db.executeTran(
                    conn,
                    "UPDATE userTable SET carId = ? WHERE orderId = ?",
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

// car allocate
export async function allocatedCarTran(): Promise<boolean> {
  let allocFlag: boolean = false;

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    const passPoints: PassablePoint[] = await map.getPassPos(conn);
    let tmpAstar: Position[] | null = [];
    // 車が割当て済みで status が 2 かつ命令が終了していないユーザの orderId を取得
    const canditateAlloc = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, orderId FROM userTable \
        WHERE carId IS NOT NULL AND orderId IS NOT NULL \
        AND endAt IS NULL LOCK IN SHARE MODE"
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
            realloc.nowPoint,
            route["route"][0][0],
            passPoints
          );
          if (tmpAstar !== null) {
            await db.executeTran(
              conn,
              "UPDATE carTable SET status = 3 WHERE carId = ?",
              [realloc.carId]
            );
            await db.executeTran(
              conn,
              "UPDATE orderTable SET nextPoint = ?, arrival = FALSE, \
              finish = FAlSE, carToRoute = ?, \
              pRoute = 0, pPoint = 0 WHERE orderId = ?",
              [tmpAstar[0], tmpAstar, realloc.orderId]
            );
            await db.executeTran(
              conn,
              "UPDATE userTable SET carId = ? WHERE orderId = ?",
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
            WHERE status = 1 AND battery >= 30 LOCK IN SHARE MODE"
          )
        );
        if (route !== undefined && car !== undefined) {
          for (const carId of car) {
            if ("route" in route && "carId" in carId && "nowPoint" in carId) {
              tmpAstar = await astar.Astar(
                carId["nowPoint"],
                route["route"][0][0],
                passPoints
              );
              if (tmpAstar !== null) {
                await db.executeTran(
                  conn,
                  "UPDATE carTable SET status = 3 WHERE carId = ?",
                  [carId["carId"]]
                );
                await db.executeTran(
                  conn,
                  "UPDATE carTable SET status = 1 WHERE carId = ?",
                  [realloc.carId]
                );
                await db.executeTran(
                  conn,
                  "UPDATE orderTable SET nextPoint = ?, arrival = FALSE, \
                  finish = FAlSE, carToRoute = ? \
                  pRoute = 0, pPoint = 0 WHERE orderId = ?",
                  [tmpAstar[0], tmpAstar, realloc.orderId]
                );
                await db.executeTran(
                  conn,
                  "UPDATE userTable SET carId = ? WHERE orderId = ?",
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
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return allocFlag;
}

// Monitoring of cars communication cycles
export async function intervalCarTran(): Promise<boolean> {
  const result = false;
  const intervalSql =
    "UPDATE carTable SET intervalCount = intervalCount + 1 \
    WHERE lastAt <= SUBTIME(NOW(), '00:00:10') && intevalCount < 3";
  const errorCarsSql =
    "SELECT carId FROM carTable WHERE intevalCount = 3 LOCK IN SHARE MODE";
  const stopCarSql = "UPDATE carTable SET status = 5 WHERE carId = ?";
  const stopOrderSql =
    "SELECT orderId FROM userTable \
    WHERE carId = ? AND endAt IS NULL LOCK IN SHARE MODE";
  const updateOrderSql =
    "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, \
    finish = TRUE, endAt = NOW() WHERE orderId = ?";

  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await db.executeTran(conn, intervalSql);
    const cars = db.extractElems(await db.executeTran(conn, errorCarsSql));
    if (cars !== undefined) {
      for (const err of cars) {
        if ("carId" in err) {
          await db.executeTran(conn, stopCarSql, [err["carId"]]);
          const order = db.extractElem(
            await db.executeTran(conn, stopOrderSql, err["carId"])
          );
          if (order !== undefined && "userId" in order) {
            await db.executeTran(conn, updateOrderSql);
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
  return result;
}

export async function intervalUserTran(): Promise<boolean> {
  const getUserSql =
    "SELECT userId, orderId, carId FROM userTable \
    WHERE startAt <= SUBTIME(NOW(), '12:00:00') AND endAt IS NULL \
    LOCK IN SHARE MODE";
  const freeOrderSql =
    "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, \
    finish = TRUE, endAt = NOW() WHERE orderId = ?";
  const freeCarSql =
    "UPDATE carTable SET status = 1 \
    WHERE carId = ? AND (status != 5 OR status != 6)";
  const freeUserSql = "UPDATE userTable SET endAt = NOW() WHERE userId = ?";
  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    const userTable = db.extractElems(await db.executeTran(conn, getUserSql));
    if (userTable !== undefined) {
      for (const elem of userTable) {
        if ("userId" in elem && "orderId" in elem && "carId" in elem) {
          if (elem["orderId"] !== null) {
            await db.executeTran(conn, freeOrderSql, [elem["orderId"]]);
          }
          if (elem["carId"] !== null) {
            await db.executeTran(conn, freeCarSql, [elem["carId"]]);
          }
          if (elem["userId"] !== null) {
            await db.executeTran(conn, freeUserSql, [elem["userId"]]);
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
  return true;
}

// Monitoring of order activity
export async function monitorOrderTran(): Promise<number[]> {
  const result: number[] = [];
  const conn = await db.createNewConn();
  const limitTimer = "24:00:00";

  try {
    await conn.beginTransaction();
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    conn.release();
  }
  return result;
}

// Advance car
export async function progressTran(
  connected: mysql.PoolConnection,
  carId: string
): Promise<Position | undefined> {
  let nextPosition: Position | undefined = undefined;
  // carId から車を進ませるのに必要な情報を取得
  const getOrderIdSql =
    "SELECT orderId FROM userTable \
    WHERE carId = UUID_TO_BIN(?, 1) AND endAt IS NULL LOCK IN SHARE MODE";
  const getStatusSql =
    "SELECT status, sequence FROM carTable \
    WHERE carId = UUID_TO_BIN(?, 1) LOCK IN SHARE MODE";
  const getParamsSql =
    "SELECT nextPoint, arrival, finish, arrange, carToRoute, route, \
    junkai, pRoute, pPoint FROM orderTable WHERE orderId = ? \
    LOCK IN SHARE MODE";
  const arrangeOrderSql =
    "UPDATE orderTable SET arrival = TRUE, arrange = TRUE, \
    pRoute = 1, pPoint = 0, nextPoint = ? WHERE orderId = ?";
  const arrangeCarSql =
    "UPDATE carTable SET status = 4 WHERE carId = UUID_TO_BIN(?, 1)";
  const notArrOrderSql =
    "UPDATE orderTable SET nextPoint = ?, \
    pPoint = pPoint + 1 WHERE orderId = ?";
  const junkaiOrderSql =
    "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, \
    pRoute = 1, pPoint = 0 WHERE orderId = ?";
  const finishOrderSql =
    "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, \
    finish = TRUE, endAt = NOW() WHERE orderId = ?";
  const finishCarSql =
    "UPDATE carTable SET status = 2 WHERE carId = UUID_TO_BIN(?, 1)";
  const arrivalOrderSql =
    "UPDATE orderTable SET nextPoint = ?, arrival = TRUE, \
    pRoute = pRoute + 1, pPoint = 0 WHERE orderId = ?";
  const arrivalCarSql =
    "UPDATE carTable SET status = 4 \
    WHERE carId = UUID_TO_BIN(?, 1)";
  const movingSql =
    "UPDATE orderTable SET nextPoint = ?, pPoint = pPoint + 1 \
    WHERE orderId = ?";

  const userTable = db.extractElem(
    await db.executeTran(connected, getOrderIdSql, [carId])
  );
  let orderId: number = 0;
  if (userTable !== undefined && "orderId" in userTable) {
    orderId = userTable["orderId"];
  } else {
    return nextPosition;
  }

  const carTable = db.extractElem(
    await db.executeTran(connected, getStatusSql, [carId])
  );
  let status: number = 0;
  if (carTable !== undefined && "status" in carTable) {
    status = carTable["status"];
  } else {
    return nextPosition;
  }

  const orderTable = db.extractElem(
    await db.executeTran(connected, getParamsSql, [orderId])
  );
  let param: proceed;
  if (
    orderTable !== undefined &&
    "nextPoint" in orderTable &&
    "arrival" in orderTable &&
    "finish" in orderTable &&
    "arrange" in orderTable &&
    "carToRoute" in orderTable &&
    "route" in orderTable &&
    "junkai" in orderTable &&
    "pRoute" in orderTable &&
    "pPoint" in orderTable
  ) {
    param = {
      nextPoint: orderTable["nextPoint"],
      arrival: orderTable["arrival"] ? true : false,
      finish: orderTable["finish"] ? true : false,
      arrange: orderTable["arrange"] ? true : false,
      carToRoute: orderTable["carToRoute"],
      route: orderTable["route"],
      junkai: orderTable["junkai"] ? true : false,
      pRoute: orderTable["pRoute"],
      pPoint: orderTable["pPoint"],
    };
    // 車が走行中で停留所に目的地にもいない場合
    if (status === 3 && !param.arrival && !param.finish) {
      // 車が経路の始点に向かっている時
      if (!param.arrange) {
        // 車が経路の始点についたら
        if (param.carToRoute.length - 1 === param.pPoint) {
          await db.executeTran(connected, arrangeOrderSql, [
            param.route[0][0],
            orderId,
          ]);
          await db.executeTran(connected, arrangeCarSql, [carId]);
        }
        // 車が経路の始点まで移動中なら
        else if (param.carToRoute.length - 1 > param.pPoint) {
          console.log("go to arrange position");
          await db.executeTran(connected, notArrOrderSql, [
            param.carToRoute[param.pPoint + 1],
            orderId,
          ]);
        }
      }
      // 車が経路の始点についた後
      else {
        // 目的地についたら
        if (
          param.route === undefined ||
          param.route[param.pRoute - 1] === undefined
        ) {
          return nextPosition;
        } else if (
          param.route.length - 1 === param.pRoute &&
          param.route[param.pRoute - 1].length - 1 === param.pPoint
        ) {
          // 巡回する場合
          if (param.junkai) {
            await db.executeTran(connected, junkaiOrderSql, [
              param.route[0][0],
              orderId,
            ]);
          }
          // 巡回しない場合
          else {
            await db.executeTran(connected, finishOrderSql, [orderId]);
            await db.executeTran(connected, finishCarSql, [carId]);
          }
        }
        // 停留所についたら
        else if (param.route[param.pRoute - 1].length - 1 === param.pPoint) {
          await db.executeTran(connected, arrivalOrderSql, [
            param.route[param.pRoute][0],
            orderId,
          ]);
          await db.executeTran(connected, arrivalCarSql, [carId]);
        }
        // 経路間移動中なら
        else {
          await db.executeTran(connected, movingSql, [
            param.route[param.pRoute - 1][param.pPoint],
            orderId,
          ]);
        }
      }
      nextPosition = param.nextPoint;
    }
  }
}
