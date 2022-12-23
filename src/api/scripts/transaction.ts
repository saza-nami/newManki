import mysql from "mysql2/promise";
import { Position, PassablePoint, AllocatedCar, proceed } from "types";
import * as astar from "api/scripts/notNotAstar";
import * as db from "database";
import * as map from "api/scripts/map";

// car allocate
export async function unallocateCarTran() {
  let allocFlag: boolean = false;
  const lockUWOWCWPR =
    "LOCK TABLES userTable WRITE, orderTable WRITE, \
    carTable WRITE, passableTable READ";
  const unlock = "UNLOCK TABLES";
  console.time("unalloc");
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockUWOWCWPR);
    let tmpAstar: Position[] | null = [];
    const order = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT orderId FROM userTable \
        WHERE carId IS NULL AND orderId IS NOT NULL \
        AND endAt IS NULL FOR UPDATE"
      )
    );
    const passPoints: PassablePoint[] = await map.getPassPos(conn);
    const car = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, nowPoint, battery FROM carTable \
        WHERE status = 1 AND battery >= 30 FOR UPDATE"
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
              WHERE orderId = ? AND endAt IS NULL FOR UPDATE",
              [orderId["orderId"]]
            )
          );
          if (route !== undefined && "route" in route) {
            // 空いている車分ループ
            for (const carId of car) {
              if ("carId" in carId && "nowPoint" in carId) {
                tmpAstar = astar.Astar(
                  carId["nowPoint"],
                  route["route"][0][0],
                  passPoints
                );
                if (tmpAstar !== null) {
                  await db.executeTran(
                    conn,
                    "UPDATE userTable SET carId = ? WHERE orderId = ?",
                    [carId["carId"], orderId["orderId"]]
                  );
                  await db.executeTran(
                    conn,
                    "UPDATE orderTable SET nextPoint = ?, carToRoute = ?, \
                    pRoute = 0, pPoint = 0 WHERE orderId = ?",
                    [tmpAstar[1], tmpAstar, orderId["orderId"]]
                  );
                  await db.executeTran(
                    conn,
                    "UPDATE carTable SET status = 3 WHERE carId = ?",
                    [carId["carId"]]
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
    await conn.query(unlock);
    conn.release();
  }
  console.timeEnd("unalloc");
  setTimeout(() => unallocateCarTran(), 5000);
}

// car reallocate
export async function allocatedCarTran() {
  let allocFlag: boolean = false;
  const lockUWOWCWPR =
    "LOCK TABLES userTable WRITE, orderTable WRITE, \
    carTable WRITE, passableTable READ";
  const unlock = "UNLOCK TABLES";
  console.time("alloc");
  const conn = await db.createNewConn();
  try {
    await conn.beginTransaction();
    await conn.query(lockUWOWCWPR);
    let tmpAstar: Position[] | null = [];
    const canditateAlloc = db.extractElems(
      await db.executeTran(
        conn,
        "SELECT carId, orderId FROM userTable \
        WHERE carId IS NOT NULL AND orderId IS NOT NULL \
        AND endAt IS NULL FOR UPDATE"
      )
    );
    const passPoints: PassablePoint[] = await map.getPassPos(conn);
    const order: AllocatedCar[] = []; // 車を割り当てなければいけない命令群
    if (canditateAlloc !== undefined) {
      // 命令候補分ループ
      for (const alloc of canditateAlloc) {
        if ("carId" in alloc && "orderId" in alloc) {
          const endAt = db.extractElem(
            await conn.execute(
              "SELECT endAt FROM orderTable \
              WHERE orderId = ? FOR UPDATE",
              [alloc["orderId"]]
            )
          );
          const car = db.extractElem(
            await db.executeTran(
              conn,
              "SELECT nowPoint, status FROM carTable \
              WHERE carId = ? FOR UPDATE",
              [alloc["carId"]]
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
          "SELECT route FROM orderTable WHERE orderId = ? FOR UPDATE",
          [realloc.orderId]
        )
      );
      if (route !== undefined) {
        if ("route" in route) {
          console.log(route["route"][0][0]);
          tmpAstar = astar.Astar(
            realloc.nowPoint,
            route["route"][0][0],
            passPoints
          );
          if (tmpAstar !== null) {
            await db.executeTran(
              conn,
              "UPDATE userTable SET carId = ? WHERE orderId = ?",
              [realloc.carId, realloc.orderId]
            );
            await db.executeTran(
              conn,
              "UPDATE orderTable SET nextPoint = ?, carToRoute = ?, \
              pRoute = 0, pPoint = 0 WHERE orderId = ?",
              [tmpAstar[1], tmpAstar, realloc.orderId]
            );
            await db.executeTran(
              conn,
              "UPDATE carTable SET status = 3 WHERE carId = ?",
              [realloc.carId]
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
            WHERE status = 1 AND battery >= 30 FOR UPDATE"
          )
        );
        if (route !== undefined && car !== undefined) {
          for (const carId of car) {
            if ("route" in route && "carId" in carId && "nowPoint" in carId) {
              tmpAstar = astar.Astar(
                carId["nowPoint"],
                route["route"][0][0],
                passPoints
              );
              if (tmpAstar !== null) {
                await db.executeTran(
                  conn,
                  "UPDATE userTable SET carId = ? WHERE orderId = ?",
                  [carId["carId"], realloc.orderId]
                );
                await db.executeTran(
                  conn,
                  "UPDATE orderTable SET nextPoint = ?, carToRoute = ? \
                  pRoute = 0, pPoint = 0 WHERE orderId = ?",
                  [tmpAstar[1], tmpAstar, realloc.orderId]
                );
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
    await conn.query(unlock);
    conn.release();
  }
  console.timeEnd("alloc");
  setTimeout(() => allocatedCarTran(), 5000);
}

// Monitoring of cars communication cycles
export async function intervalCarTran() {
  const intervalSql =
    "UPDATE carTable SET intervalCount = intervalCount + 1 \
    WHERE lastAt <= SUBTIME(NOW(), '00:00:10') && intevalCount < 3";
  const errorCarsSql =
    "SELECT carId FROM carTable WHERE intevalCount = 3 FOR UPDATE";
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
          const order = db.extractElem(
            await db.executeTran(conn, stopOrderSql, err["carId"])
          );
          await db.executeTran(conn, stopCarSql, [err["carId"]]);
          if (order !== undefined && "userId" in order) {
            await db.executeTran(conn, updateOrderSql, [order["orderId"]]);
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
  setTimeout(() => intervalCarTran(), 5000);
}

export async function intervalUserTran() {
  const lockUWOWCW =
    "LOCK TABLES userTable WRITE, orderTable WRITE, carTable WRITE";
  const unlock = "UNLOCK TABLES";
  const getUserSql =
    "SELECT userId, orderId, carId FROM userTable \
    WHERE startAt <= SUBTIME(NOW(), '12:00:00') AND endAt IS NULL \
    FOR UPDATE";
  const freeUserSql = "UPDATE userTable SET endAt = NOW() WHERE userId = ?";
  const freeOrderSql =
    "UPDATE orderTable SET nextPoint = NULL, arrival = TRUE, \
    finish = TRUE, endAt = NOW() WHERE orderId = ?";
  const freeCarSql =
    "UPDATE carTable SET status = 1 \
    WHERE carId = ? AND (status != 5 OR status != 6)";
  const conn = await db.createNewConn();

  try {
    await conn.beginTransaction();
    await conn.query(lockUWOWCW);
    const userTable = db.extractElems(await db.executeTran(conn, getUserSql));
    if (userTable !== undefined) {
      for (const elem of userTable) {
        if ("userId" in elem && "orderId" in elem && "carId" in elem) {
          if (elem["userId"] !== null) {
            await db.executeTran(conn, freeUserSql, [elem["userId"]]);
          }
          if (elem["orderId"] !== null) {
            await db.executeTran(conn, freeOrderSql, [elem["orderId"]]);
          }
          if (elem["carId"] !== null) {
            await db.executeTran(conn, freeCarSql, [elem["carId"]]);
          }
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.log(err);
  } finally {
    await conn.query(unlock);
    conn.release();
  }
  setTimeout(() => intervalUserTran(), 5000);
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
  carId: string,
  status: number
): Promise<Position | undefined> {
  let nextPosition: Position | undefined = undefined;
  // carId から車を進ませるのに必要な情報を取得
  const getOrderIdSql =
    "SELECT orderId FROM userTable \
    WHERE carId = UUID_TO_BIN(?, 1) AND endAt IS NULL FOR UPDATE";
  const getParamsSql =
    "SELECT nextPoint, arrival, finish, arrange, carToRoute, route, \
    junkai, pRoute, pPoint FROM orderTable WHERE orderId = ? \
    FOR UPDATE";
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
  if (
    userTable !== undefined &&
    "orderId" in userTable &&
    userTable["orderId"] !== undefined
  ) {
    orderId = userTable["orderId"];
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
    orderTable["nextPoint"] !== undefined &&
    "arrival" in orderTable &&
    orderTable["arrival"] !== undefined &&
    "finish" in orderTable &&
    orderTable["finish"] !== undefined &&
    "arrange" in orderTable &&
    orderTable["arrange"] !== undefined &&
    "carToRoute" in orderTable &&
    orderTable["carToRoute"] !== undefined &&
    "route" in orderTable &&
    orderTable["route"] !== undefined &&
    "junkai" in orderTable &&
    orderTable["junkai"] !== undefined &&
    "pRoute" in orderTable &&
    orderTable["pRoute"] !== undefined &&
    "pPoint" in orderTable &&
    orderTable["pPoint"] !== undefined
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
    console.log(param);
    // 車が走行中で停留所に目的地にもいない場合
    if (status === 3 && !param.arrival && !param.finish) {
      // 車が経路の始点に向かっている時
      if (!param.arrange) {
        // 車が経路の始点についたら
        if (param.carToRoute.length - 1 === param.pPoint) {
          await db.executeTran(connected, arrangeOrderSql, [
            param.route[0][1],
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
          param.route.length === param.pRoute &&
          param.route[param.pRoute - 1].length - 2 === param.pPoint
        ) {
          // 巡回する場合
          if (param.junkai) {
            await db.executeTran(connected, junkaiOrderSql, [
              param.route[0][1],
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
        else if (param.route[param.pRoute - 1].length - 2 === param.pPoint) {
          await db.executeTran(connected, arrivalOrderSql, [
            param.route[param.pRoute][0],
            orderId,
          ]);
          await db.executeTran(connected, arrivalCarSql, [carId]);
        }
        // 経路間移動中なら
        else {
          await db.executeTran(connected, movingSql, [
            param.route[param.pRoute - 1][param.pPoint + 2],
            orderId,
          ]);
        }
      }
      nextPosition = param.nextPoint;
    }
  }
  return nextPosition;
}
