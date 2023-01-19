---
title: intro
subtitle: Manki API Reference Manual
author:
  - [Takatomo0424]
---

# 名称

**`intro`** -- Manki API の概要

# 解説

Manki API は Manki サービスの機能を提供する一連の Web API 群です。
これらの API を利用することで NinJa の動作を制御することができます。

# 定義

Manki API for Administrator Reference Manual では次の用語を定義しています。

管理者
: 車両管理・制御システム `Manki` を管理する人。

車
: NinJa のこと。

地点
: 地球上での位置を一意に定めるための緯度と経度の対。
プログラム中では `Position` として次のように表現される。

```ts
interface Position {
  lat: number; // 緯度（°; 北緯を正）
  lng: number; // 経度（°; 東経を正）
}
```

（車が）正常状態・異常状態である
: NinJa と Manki の間で通信が確立されており、
NinJa が Manki の管理下にあることを（車が）正常状態にあるという。
さもなければ（車が）異常状態にあるという。

車情報
: 管理車に提供される車の情報。
車識別子、車の状態、現在地、バッテリー残量、最終通信時刻からなる。
車の状態は Manki DB の 3.2.2. status（状態） を参照。
プログラム中では、それに識別子を加えて `PassableInfo` として
次のように表現される。

```ts
interface CarInfo {
  carId: number; // 車識別子
  status: number; // 車の状態
  nowPoint: Position; // 現在地
  battery: number; // バッテリー残量（単位:[%]）
  lastAt: string; // 最終通信時刻
}
```

通行可能領域情報
: 車が通行可能である領域を表す地点とその地点からの半径の対。
プログラム中では、それに識別子を加えて `PassableInfo` として
次のように表現される。

```ts
interface PassableInfo {
  position: Position; // 地点
  radius: number; // 半径（メートル）
  passableId: number; // 識別子
}
```

# 関連項目

- Manki API for Administrator Reference Manual の **addPassable**, **changePasswd**, **delPassable**,
  **loginAdmin**, **manageCar**, **reqCarInfo**, **reqPassAdmin**,
  **terminateAdmin**
- Manki for Administrator Programmer's Manual の **API**(3)

# 作者

Manki API for Administrator の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれました。

# バグ

予告なく変更が加えられる場合があります。

[saza-nami]: https://github.com/saza-nami
[kusaremkn]: https://github.com/KusaReMKN