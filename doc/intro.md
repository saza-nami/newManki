---
title: intro
subtitle: Manki API Reference Manual
author:
  - [KusaReMKN]
---

# 名称

**`intro`** -- Manki API の概要

# 解説

Manki API は Manki サービスの機能を提供する一連の Web API 群です。
これらの API を利用することで NinJa の動作を制御することができます。

# 定義

Manki API Reference Manual では次の用語を定義しています。

車
: NinJa のこと。

経路
: 車が走行する一連の道のり。
1 個以上のルートの配列として表現される。

ルート
: ある停留所から次の停留所までの道のり。
1 個の始点（停留所）、0 個以上の中継点、1 個の終点（停留所）の地点を
この順に持つ配列として表現される。

停留所
: 経路において、車が停車する地点。

（経路の）始点
: 経路において、最初の停留所。

目的地
: 経路において、最後の停留所。

始点
: 経路において、最初の停留所。
または、ルートにおいて、最初の地点。

地点
: 地球上での位置を一意に定めるための緯度と経度の対。
プログラム中では `Position` として次のように表現される。

```ts
interface Position {
  lat: number; // 緯度（°; 北緯を正）
  lng: number; // 経度（°; 東経を正）
}
```

（ユーザに）車が割り当てられている
: 経路を実行できる車の確保が完了している状態。

（車が）正常状態・異常状態である
: NinJa と Manki の間で通信が確立されており、
NinJa が Manki の管理下にあることを（車が）正常状態にあるという。
さもなければ（車が）異常状態にあるという。

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

経路名情報
: 保存済みの経路に付けられた名前とその経路を利用可能であるかを表す真偽値の対。
プログラム中では `PassableName` として次のように表現される。

```ts
interface PassableName {
  routeName: string; // 経路の名前
  available: boolean; // 利用可能なら真
}
```

# ステータスコード 500 について

API が ステータスコード 500 を返す場合はサーバに何らかのエラーが発生した場合に返ります。またエラー内容は各 API の診断のその他に該当します。

# 関連項目

- Manki API Reference Manual の **astar**, **createUser**, **endRoute**,
  **isAcceptable**, **monitorCar**, **proceedRoute**, **reqPassable**,
  **reqRoute**, **routeName**, **saveRoute**, **terminate**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [saza-nami][saza-nami] によって書かれたものを元に
[KusaReMKN][kusaremkn] によって書かれました。

# バグ

予告なく変更が加えられる場合があります。

[saza-nami]: https://github.com/saza-nami
[kusaremkn]: https://github.com/KusaReMKN
