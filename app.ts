import mysql from "mysql2/promise";

interface ApiResult {
  succeeded: boolean;
}

interface CreateUserResult extends ApiResult {
  userId?: string;
}

const CONNECTION_OPTIONS: mysql.ConnectionOptions = {
  host: "db.kohga.local",
  database: "test",
  user: "user",
  password: "P@ssw0rd",
};

const MAX_USERS = 10; // FIXME

async function createUser(): Promise<CreateUserResult> {
  const conn = await mysql.createConnection(CONNECTION_OPTIONS);
  const [result, fields] = await conn.execute("CALL createUserProc(?)", [
    MAX_USERS,
  ]);
  const ret: CreateUserResult = { succeeded: false };
  if ("length" in result && result.length > 2) {
    const rows = result[1];
    if ("shift" in rows) {
      const row = rows.shift();
      const userId = row && row["BIN_TO_UUID(userId, 1)"];
      if (userId) {
        ret.succeeded = true;
        ret.userId = userId;
      }
    }
  }
  await conn.end();
  console.log(ret);
  return ret;
}

createUser();
