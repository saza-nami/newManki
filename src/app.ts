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
    "http://main.kohga.local:3000",
    "http://karawasa.kohga.local:3000",
    "http://api.kohga.local:3000",
    "http://www.kohga.local:3000",
    "http://karawasa.kohga.local:3000",
    "http://mkn.kohga.local:3000",
    "http://saza.kohga.local:3000",
    "http://sazasub.kohga.local:3000",
    "http://tktm.kohga.local:3000",
    "http://yoke.kohga.local:3000",
    "http://watanabe.kohga.local:3000",
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
