import mysql from "mysql2/promise";
import {
  Position,
  PassablePoint,
  AllocatedCar,
  proceed,
  order,
  car,
} from "types";
import * as Astar from "api/scripts/notNotAstar";
import * as db from "database";
import * as map from "api/scripts/map";

// car allocate
export async function unallocateCarTran() {
  console.log("called");
  let allocFlag: boolean = false;
  const lockURPRORCR =
    "LOCK TABLES userTable READ, passableTable READ, \
    orderTable READ, carTable READ";
  const getOrderIds =
    "SELECT orderId FROM userTable WHERE carId IS NULL \
    AND orderId IS NOT NULL AND endAt IS NULL LOCK IN SHARE MODE";
  const getCarsInfo =
    "SELECT BIN_TO_UUID(carId, 1), nowPoint FROM carTable \
    WHERE status = 1 AND battery >= 30 LOCK IN SHARE MODE";
  const reqRoute =
    "SELECT route FROM orderTable WHERE orderId = ? AND endAt IS NULL";
  const lockUWOWCW =
    "LOCK TABLES userTable WRITE, orderTable WRITE, carTable WRITE";
  const reqCarInfo =
    "SELECT status, nowPoint FROM carTable \
    WHERE carId = UUID_TO_BIN(?,1) FOR UPDATE";
  const reqOrderEndAt =
    "SELECT endAt FROM orderTable WHERE orderId = ? FOR UPDATE";
  const updUserInfo =
    "UPDATE userTable SET carId = UUID_TO_BIN(?,1) WHERE orderId = ?";
  const updOrderInfo =
    "UPDATE orderTable SET nextPoint = ?, carToRoute = ?, \
    pRoute = 0, pPoint = 0 WHERE orderId = ?";
  const updCarStatus =
    "UPDATE carTable SET status = 3 WHERE carId = UUID_TO_BIN(?,1)";
  const unlock = "UNLOCK TABLES";

  let passPoints: PassablePoint[] = [];
  let cars: car[] = [];
  let orders: order[] = [];
  const conn1 = await db.createNewConn();
  try {
    await conn1.beginTransaction();
    await conn1.query(lockURPRORCR);
    passPoints = await map.getPassPos(conn1);
    const orderIds = db.extractElems(await db.executeTran(conn1, getOrderIds));
    const carsInfo = db.extractElems(await db.executeTran(conn1, getCarsInfo));
    if (orderIds !== undefined) {
      for (const orderId of orderIds) {
        if ("orderId" in orderId && orderId["orderId"] !== undefined) {
          const route = db.extractElem(
            await db.executeTran(conn1, reqRoute, [orderId["orderId"]])
          );
          if (
            route !== undefined &&
            "route" in route &&
            route["route"] !== undefined
          ) {
            orders.push({ orderId: orderId["orderId"], route: route["route"] });
            allocFlag = true;
          }
        }
      }
    }
    if (carsInfo !== undefined) {
      for (const carInfo of carsInfo) {
        if (
          "BIN_TO_UUID(carId, 1)" in carInfo &&
          carInfo["BIN_TO_UUID(carId, 1)"] !== undefined &&
          "nowPoint" in carInfo &&
          carInfo["nowPoint"] !== undefined
        ) {
          cars.push({
            carId: carInfo["BIN_TO_UUID(carId, 1)"],
            nowPoint: carInfo["nowPoint"],
          });
        }
      }
    }
    await conn1.commit();
    await conn1.query(unlock);
  } catch (err) {
    await conn1.rollback();
    console.log(err);
  } finally {
    conn1.release();
  }
  if (allocFlag) {
    for (const order of orders) {
      allocFlag = false;
      if (cars !== undefined) {
        for (const car of cars) {
          const carToRoute: Position[] | null = await Astar.manAstar(
            car.nowPoint,
            order.route[0][0],
            passPoints
          );
          if (carToRoute !== null) {
            allocFlag = true;
            const conn2 = await db.createNewConn();
            try {
              await conn2.beginTransaction();
              await conn2.query(lockUWOWCW);
              const orderEndAt = db.extractElem(
                await db.executeTran(conn2, reqOrderEndAt, [order.orderId])
              );
              const latest = db.extractElem(
                await db.executeTran(conn2, reqCarInfo, [car.carId])
              );
              if (
                orderEndAt !== undefined &&
                "endAt" in orderEndAt &&
                orderEndAt["endAt"] === null &&
                latest !== undefined &&
                "nowPoint" in latest &&
                latest["nowPoint"] !== undefined &&
                "status" in latest &&
                latest["status"] === 1
              ) {
                if (map.approx(car.nowPoint, latest["nowPoint"])) {
                  await db.executeTran(conn2, updUserInfo, [
                    car.carId,
                    order.orderId,
                  ]);
                  await db.executeTran(conn2, updOrderInfo, [
                    carToRoute[1],
                    carToRoute,
                    order.orderId,
                  ]);
                  await db.executeTran(conn2, updCarStatus, [car.carId]);
                }
              }
              await conn2.commit();
              await conn2.query(unlock);
            } catch (err) {
              await conn2.rollback();
              console.log(err);
            } finally {
              conn2.release();
            }
            console.log(
              "allocate orderId: " + order.orderId + ", carId: " + car.carId
            );
          }
          // }
          if (allocFlag) {
            break;
          }
        }
      }
    }
  }
  setTimeout(() => unallocateCarTran(), 5000);
}

export async function allocatedCarTran() {
  let allocFlag: boolean = false;
  const lockURPRORCR =
    "LOCK TABLES userTable READ, passableTable READ, \
    orderTable READ, carTable READ";
  const getLists =
    "SELECT orderId, BIN_TO_UUID(carId,1) FROM userTable \
    WHERE orderId IS NOT NULL AND carId IS NOT NULL AND \
    endAt IS NULL LOCK IN SHARE MODE";
  const judgeEndAt =
    "SELECT route, endAt FROM orderTable WHERE orderId = ? LOCK IN SHARE MODE";
  const judgeStatus =
    "SELECT status, nowPoint FROM carTable \
    WHERE carId = UUID_TO_BIN(?,1) LOCK IN SHARE MODE";
  const lockOWCW = "LOCK TABLES orderTable WRITE, carTable WRITE";
  const reqCarInfo =
    "SELECT status, nowPoint FROM carTable \
    WHERE carId = UUID_TO_BIN(?,1) FOR UPDATE";
  const reqOrderEndAt =
    "SELECT endAt FROM orderTable WHERE orderId = ? FOR UPDATE";
  const updOrderInfo =
    "UPDATE orderTable SET nextPoint = ?, carToRoute = ?, \
    pRoute = 0, pPoint = 0 WHERE orderId = ?";
  const updCarStatus =
    "UPDATE carTable SET status = 3 WHERE carId = UUID_TO_BIN(?,1)";
  const lockCR = "LOCK TABLES carTable READ";
  const getCarsInfo =
    "SELECT carId, nowPoint FROM carTable WHERE carId != UUID_TO_BIN(?,1) \
    AND status = 1 AND battery >= 30 LOCK IN SHARE MODE";
  const lockUWOWCW =
    "LOCK TABLES userTable WRITE, orderTable WRITE, carTable WRITE";
  const updUserInfo =
    "UPDATE userTable SET carId = UUID_TO_BIN(?,1) WHERE orderId = ?";
  const unlock = "UNLOCK TABLES";

  let allocates: AllocatedCar[] = [];
  let passPoints: PassablePoint[] = [];
  const conn1 = await db.createNewConn();
  try {
    await conn1.beginTransaction();
    await conn1.query(lockURPRORCR);
    passPoints = await map.getPassPos(conn1);
    const lists = db.extractElems(await db.executeTran(conn1, getLists));
    if (lists !== undefined) {
      for (const list of lists) {
        if (
          "orderId" in list &&
          list["orderId"] !== undefined &&
          "BIN_TO_UUID(carId,1)" in list &&
          list["BIN_TO_UUID(carId,1)"] !== undefined
        ) {
          const order = db.extractElem(
            await db.executeTran(conn1, judgeEndAt, [list["orderId"]])
          );
          const car = db.extractElem(
            await db.executeTran(conn1, judgeStatus, [
              list["BIN_TO_UUID(carId,1)"],
            ])
          );
          if (
            order !== undefined &&
            "endAt" in order &&
            order["endAt"] === null &&
            "route" in order &&
            order["route"] !== undefined &&
            car !== undefined &&
            "status" in car &&
            car["status"] === 2 &&
            "nowPoint" in car &&
            car["nowPoint"] !== undefined
          ) {
            allocates.push({
              order: { orderId: list["orderId"], route: order["route"] },
              car: {
                carId: list["BIN_TO_UUID(carId,1)"],
                nowPoint: car["nowPoint"],
              },
            });
            allocFlag = true;
          }
        }
      }
    }
    await conn1.commit();
    await conn1.query(unlock);
  } catch (err) {
    await conn1.rollback();
    console.log(err);
  } finally {
    conn1.release();
  }

  if (allocFlag) {
    for (const allocate of allocates) {
      allocFlag = false;
      const carToRoute: Position[] | null = await Astar.manAstar(
        allocate.car.nowPoint,
        allocate.order.route[0][0],
        passPoints
      );
      if (carToRoute !== null) {
        const conn2 = await db.createNewConn();
        try {
          await conn2.beginTransaction();
          await conn2.query(lockOWCW);
          const orderEndAt = db.extractElem(
            await db.executeTran(conn2, reqOrderEndAt, [allocate.order.orderId])
          );
          const latest = db.extractElem(
            await db.executeTran(conn2, reqCarInfo, [allocate.car.carId])
          );
          if (
            orderEndAt !== undefined &&
            "endAt" in orderEndAt &&
            orderEndAt["endAt"] === null &&
            latest !== undefined &&
            "nowPoint" in latest &&
            latest["nowPoint"] !== undefined &&
            "status" in latest &&
            latest["status"] === 2
          ) {
            if (map.approx(allocate.car.nowPoint, latest["nowPoint"])) {
              await db.executeTran(conn2, updOrderInfo, [
                carToRoute[1],
                carToRoute,
                allocate.order.orderId,
              ]);
              await db.executeTran(conn2, updCarStatus, [allocate.car.carId]);
            }
          }
          await conn2.commit();
          await conn2.query(unlock);
        } catch (err) {
          await conn2.rollback();
          console.log(err);
        } finally {
          conn2.release();
        }
        console.log(
          "allocate orderId: " +
            allocate.order.orderId +
            ", carId: " +
            allocate.car.carId
        );
      } else {
        let cars: car[] = [];
        const conn3 = await db.createNewConn();
        try {
          await conn3.beginTransaction();
          await conn3.query(lockCR);
          const carsInfo = db.extractElems(
            await db.executeTran(conn3, getCarsInfo, [allocate.car.carId])
          );
          if (carsInfo !== undefined) {
            for (const carInfo of carsInfo) {
              if (
                "BIN_TO_UUID(carId,1)" in carInfo &&
                carInfo["BIN_TO_UUID(carId,1)"] !== undefined &&
                "nowPoint" in carInfo &&
                carInfo["nowPoint"] !== undefined
              ) {
                cars.push({
                  carId: carInfo["BIN_TO_UUID(carId,1)"],
                  nowPoint: carInfo["nowPoint"],
                });
              }
            }
          }
          await conn3.commit();
          await conn3.query(unlock);
        } catch (err) {
          await conn3.rollback();
          console.log(err);
        } finally {
          conn3.release();
        }
        for (const car of cars) {
          const carToRoute: Position[] | null = await Astar.manAstar(
            car.nowPoint,
            allocate.order.route[0][0],
            passPoints
          );
          if (carToRoute !== null) {
            allocFlag = true;
            const conn4 = await db.createNewConn();
            try {
              await conn4.beginTransaction();
              await conn4.query(lockUWOWCW);
              const orderEndAt = db.extractElem(
                await db.executeTran(conn4, reqOrderEndAt, [
                  allocate.order.orderId,
                ])
              );
              const latest = db.extractElem(
                await db.executeTran(conn4, reqCarInfo, [car.carId])
              );
              if (
                orderEndAt !== undefined &&
                "endAt" in orderEndAt &&
                orderEndAt["endAt"] === null &&
                latest !== undefined &&
                "nowPoint" in latest &&
                latest["nowPoint"] !== undefined &&
                "status" in latest &&
                latest["status"] === 1
              ) {
                if (map.approx(allocate.car.nowPoint, latest["nowPoint"])) {
                  await db.executeTran(conn4, updUserInfo, [
                    car.carId,
                    allocate.order.orderId,
                  ]);
                  await db.executeTran(conn4, updOrderInfo, [
                    carToRoute[1],
                    carToRoute,
                    allocate.order.orderId,
                  ]);
                  await db.executeTran(conn4, updCarStatus, [car.carId]);
                }
              }
              await conn4.commit();
              await conn4.query(unlock);
            } catch (err) {
              await conn4.rollback();
              console.log(err);
            } finally {
              conn4.release();
            }
          }
          console.log(
            "allocate orderId: " +
              allocate.order.orderId +
              ", carId: " +
              car.carId
          );
          if (allocFlag) {
            break;
          }
        }
      }
    }
  }
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
