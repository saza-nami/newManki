// dos 対策用
export interface Access {
  date: number[];
  ipAddress: string[];
}

export interface AllocatedCar {
  orderId: number;
  carId: string;
  nowPoint: Position;
}

// API の返り値
export interface ApiResult {
  succeeded: boolean;
  reason?: string;
}

// 地点
export interface Position {
  lat: number /* 緯度　*/;
  lng: number /* 経度 */;
}

// 通行可能領域
export interface PassablePoint {
  position: Position;
  radius: number;
}

// 地点情報
export interface Node {
  position: Position;
  gCost: number /* startから現在地点までのコスト */;
  hCost: number /* 現在地点からgoalまでのコスト */;
  comfirm: boolean /* 評価済み判定 */;
  parent: number | null /* 親ノードの配列番号 */;
}

// 経路走行に必要な情報
export interface proceed {
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
