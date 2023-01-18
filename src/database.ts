import mysql from "mysql2/promise";

export const CONNECTION_OPTIONS: mysql.ConnectionOptions = {
  host: "db.kohga.local",
  database: "test",
  user: "user",
  password: "P@ssw0rd",
};

const CONNECTIONPOOL_OPTIONS: mysql.PoolOptions = {
  connectionLimit: 10,
  host: "db.kohga.local",
  database: "test",
  user: "user",
  password: "P@ssw0rd",
};

const createPool = mysql.createPool(CONNECTIONPOOL_OPTIONS);

// もはや使用されていない execute
async function execute<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(sql: string): Promise<[T, mysql.FieldPacket[]]>;

async function execute<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(
  sql: string,
  values: any | any[] | { [param: string]: any }
): Promise<[T, mysql.FieldPacket[]]>;

async function execute<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(options: mysql.QueryOptions): Promise<[T, mysql.FieldPacket[]]>;

async function execute<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(
  options: mysql.QueryOptions,
  values: any | any[] | { [param: string]: any }
): Promise<[T, mysql.FieldPacket[]]>;

async function execute(
  arg1: string | mysql.QueryOptions,
  arg2?: any | any[] | { [param: string]: any }
) {
  const conn = mysql.createPool(CONNECTIONPOOL_OPTIONS);
  await conn.getConnection();
  const result = await (typeof arg1 === "string"
    ? conn.execute(arg1, arg2)
    : conn.execute(arg1, arg2));
  await conn.end();
  return result;
}

async function executeTran<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(
  connected: mysql.PoolConnection,
  sql: string
): Promise<[T, mysql.FieldPacket[]]>;

async function executeTran<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(
  connected: mysql.PoolConnection,
  sql: string,
  values: any | any[] | { [param: string]: any }
): Promise<[T, mysql.FieldPacket[]]>;

async function executeTran<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(
  connected: mysql.PoolConnection,
  options: mysql.QueryOptions
): Promise<[T, mysql.FieldPacket[]]>;

async function executeTran<
  T extends
    | mysql.RowDataPacket[][]
    | mysql.RowDataPacket[]
    | mysql.OkPacket
    | mysql.OkPacket[]
    | mysql.ResultSetHeader
>(
  connected: mysql.PoolConnection,
  options: mysql.QueryOptions,
  values: any | any[] | { [param: string]: any }
): Promise<[T, mysql.FieldPacket[]]>;

/** トランザクション内でのみ実行できる execute 関数 */
async function executeTran(
  connected: mysql.PoolConnection,
  arg1: string | mysql.QueryOptions,
  arg2?: any | any[] | { [param: string]: any }
) {
  const result = await (typeof arg1 === "string"
    ? connected.execute(arg1, arg2)
    : connected.execute(arg1, arg2));
  return result;
}

/** データベースから返された単一の要素を取り出す */
function extractElem(
  sqlResult: [
    (
      | mysql.RowDataPacket[]
      | mysql.RowDataPacket[][]
      | mysql.OkPacket
      | mysql.OkPacket[]
      | mysql.ResultSetHeader
    ),
    mysql.FieldPacket[]
  ]
): mysql.RowDataPacket | undefined {
  if (Array.isArray(sqlResult) && Array.isArray(sqlResult[0])) {
    const row = sqlResult[0][0];
    return row as mysql.RowDataPacket;
  } else {
    return undefined;
  }
}

/** データベースから返された複数の要素を取り出す */
function extractElems(
  sqlResult: [
    (
      | mysql.RowDataPacket[]
      | mysql.RowDataPacket[][]
      | mysql.OkPacket
      | mysql.OkPacket[]
      | mysql.ResultSetHeader
    ),
    mysql.FieldPacket[]
  ]
): mysql.RowDataPacket[] | undefined {
  if (Array.isArray(sqlResult) && Array.isArray(sqlResult[0])) {
    const row = sqlResult[0];
    return row as mysql.RowDataPacket[];
  } else {
    return undefined;
  }
}

/** pool接続をする */
async function createNewConn(): Promise<mysql.PoolConnection> {
  const conn = await createPool.getConnection();
  return conn;
}

export { executeTran, extractElem, extractElems, createNewConn };
