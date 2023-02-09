/** dos 対策用 */
export interface Access {
  date: number[];
  ipAddress: string[];
}

/** 割り当て済み命令 */
export interface Allocated {
  order: order;
  car: car;
}

/** 全 API の返り値に含まれるメンバ */
export interface ApiResult {
  succeeded: boolean;
  reason?: string;
}

/** 車割り当てに必要な車情報 */
export interface car {
  carId: string;
  nowPoint: Position;
}

/** 地点情報 */
export interface NodeInfo {
  position: Position;
  gCost: number /* startから現在地点までのコスト */;
  hCost: number /* 現在地点からgoalまでのコスト */;
  comfirm: boolean /* 評価済み判定 */;
  parent: number | null /* 親ノードの配列番号 */;
}

/** 車割り当てに必要な命令情報 */
export interface order {
  orderId: number;
  route: Position[][];
}

/** 通行可能領域 */
export interface PassablePoint {
  position: Position;
  radius: number;
}

/** 地点 */
export interface Position {
  lat: number /* 緯度　*/;
  lng: number /* 経度 */;
}

/** 経路走行に必要な情報 */
export interface Proceed {
  nextPoint: Position;
  arrival: boolean;
  finish: boolean;
  arrange: boolean;
  carToRoute: Position[];
  route: Position[][];
  junkai: boolean;
  pRoute: number;
  pPoint: number;
}
