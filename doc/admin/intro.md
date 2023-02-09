---
title: intro
subtitle: Manki API for Administrator Reference Manual
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
プログラム中では、それに識別子を加えて `PassableInfo` として
次のように表現される。

```ts
interface CarInfo {
  carId: string; // 車識別子
  status: number; // 車の状態
  nowPoint: Position; // 現在地
  battery: number; // バッテリー残量（単位:[%]）
  lastAt: string; // 最終通信時刻
}
```

車の状態は以下の通りです。

| status | 説明                                                                            |
| ------ | ------------------------------------------------------------------------------- |
| 1      | 暇状態 : 車がどのユーザにも割り当てられていない状態                             |
| 2      | 待ち状態 : 車がユーザに割り当てられていて、経路が実行されていない状態           |
| 3      | 実行中・走行状態 : 車がユーザに割り当てられていて、経路を実行中かつ走行中の状態 |
| 4      | 実行中・停止状態 : 車がユーザに割り当てられていて、経路を実行中かつ停止中の状態 |
| 5      | 確認されていない異常状態 : 車に異常が発生していて、管理者が認知していない状態   |
| 6      | 確認された異常状態 : 車に異常が発生していて、管理者が認知している状態           |

通行可能領域

: 車が通行通行可能である領域を表す地点とその地点からの半径の対。
プログラム中では、次のように表現される。

```typescript
interface PassablePoint {
  position: Position; // 地点
  radius: number; // 半径（メートル）
}
```

通行可能領域情報
: 通行可能領域に識別子を加えたもの。
プログラム中では `PassableInfo` として次のように表現される。

```ts
interface PassableInfo extends PassablePoint {
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
