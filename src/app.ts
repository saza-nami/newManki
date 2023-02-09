/** API server の設定等を行う */

import express from "express";
import cors from "cors";
import routers from "api/_routers";
import * as admin from "api/admin/admin";
import * as tran from "api/scripts/transaction";

/** express を利用する */
const app = express();
const port = 80;

/** cors Option の設定 */
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
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
/** cors Option を全 API に適用 */
app.use(cors(corsOptions));

/** クライアントからの送信データに req.body.~ でアクセスできるようにする */
app.use(express.json());

/** 各 API をルーティングする */
for (const router of routers) app.use("/", router);

/** サーバのポート開放 */
app.listen(port, () => console.log(`Listening on port ${port}`));

/** 内部処理群 */
tran.unallocateCarTran();
tran.allocatedCarTran();
admin.terminateInterval();
tran.intervalUserTran();
