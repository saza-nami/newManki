import express from "express";
import cors from "cors";
import routers from "./api/_routers";
import * as admin from "./api/admin/admin";
import * as tran from "./api/scripts/transaction";
import report from "./api/_report";

const app = express();
const port = 3001;

const corsOptions: cors.CorsOptions = {
  origin: [
    "http://karawasa.kohga.local:8080",
    "http://localhost",
    "http://localhost:3000",
    "http://www.kohga.local",
    "http://karawasa.kohga.local",
  ], // FOR DEBUG
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.set("etag", false);
app.use(express.json());

for (const router of routers) app.use("/", router);

app.listen(port, () => console.log(`Listening on port ${port}`));

tran.unallocateCarTran();
tran.allocatedCarTran();
admin.terminateInterval();
tran.intervalUserTran();
