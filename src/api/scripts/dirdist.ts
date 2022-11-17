import { Position } from "../../types";

const deg2rad = (deg: number) => deg * (Math.PI / 180.0);
const rad2deg = (rad: number) => rad / (Math.PI / 180.0);

/** 赤道半径[m] */
const RNeE = 6378137.0;
/** 極半径[m] */
const RNpE = 6356752.314;
const EE = 6.6943800667647752646078789117815793753471556034992729408828e-3;

const RoPMC = (alat: number) =>
  (RNeE * (1 - EE)) / Math.pow(1 - EE * Math.sin(alat) ** 2, 1.5);
const RoPVC = (alat: number) => RNeE / Math.sqrt(1 - EE * Math.sin(alat) ** 2);

// 2点間の距離算出
function distanceTo(p: Position, q: Position) {
  const e2 = (RNeE ** 2 - RNpE ** 2) / RNeE ** 2; // 離心率 E^2
  const dx = ((q.lng - p.lng) * Math.PI) / 180; // 経度の差をラジアン変換
  const dy = ((q.lat - p.lat) * Math.PI) / 180; // 緯度の差をラジアン変換
  const my = (((q.lat + p.lat) / 2.0) * Math.PI) / 180; // 緯度の平均をラジアン変換
  const w = Math.sqrt(1 - e2 * Math.sin(my) * Math.sin(my));
  const m = (RNeE * (1 - e2)) / Math.pow(w, 3); // 子午線曲率半径
  const n = RNeE / w; // 卯酉線曲率半径
  return Math.sqrt(Math.pow(dy * m, 2) + Math.pow(dx * n * Math.cos(my), 2));
}

// p地点からdistance[m] direction[度]移動させた地点算出
function moveBy(p: Position, distance: number, direction: number) {
  const clat = deg2rad(p.lat);
  const dlat = (distance * Math.cos(deg2rad(direction))) / RoPMC(clat);
  const dlng =
    (distance * Math.sin(deg2rad(direction))) / (RoPVC(clat) * Math.cos(clat));
  const result: Position = {
    lat: normalizeLat(p.lat + rad2deg(dlat)),
    lng: normalizeLng(p.lng + rad2deg(dlng)),
  };
  return result;
}

function normalizeLat(lat: number) {
  while (lat > 90) lat -= lat - 90;
  while (lat < -90) lat -= lat + 90;
  return lat;
}

function normalizeLng(lng: number) {
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return lng;
}

export { distanceTo, moveBy };
