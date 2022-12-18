import express from "express";
import cors from "cors";
import routers from "api/_routers";
import * as admin from "api/admin/admin";
import * as tran from "api/scripts/transaction";
import report from "api/_report";

const app = express();
const port = 80;

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

const carAllocInterval = setInterval(async () => {
  report(await tran.unallocateCarTran());
  report(await tran.allocatedCarTran());
}, 5000);

const adminInterval = setInterval(async () => {
  report(await admin.terminateInterval());
}, 30000);

const userInterval = setInterval(async () => {
  report(await tran.intervalUserTran());
}, 5000);
