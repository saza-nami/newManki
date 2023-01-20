import express from "express";
import cors from "cors";
import routers from "api/_routers";
import * as admin from "api/admin/admin";
import * as tran from "api/scripts/transaction";

const app = express();
const port = 80;

const corsOptions: cors.CorsOptions = {
  origin: [
    "http://karawasa.kohga.local:8080",
    "http://localhost:3000", // FOR RASPI
    "http://www.kohga.local",
    "http://karawasa.kohga.local",
    "http://tktm.kohga.local",
    "http://saza.kohga.local",
    "http://wata.kohga.local",
    "http://watanabe.kohga.local",
    "http://mkn.kohga.local",
    "http://yoke.kohga.local",
    "http://sazasub.kohga.local",
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
