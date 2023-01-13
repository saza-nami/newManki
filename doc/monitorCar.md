---
title: monitorCar
subtitle: Manki API Reference Manual
author:
  - Takatomo0424
  - KusaReMKN
---

# 名称

**`monitorCar`** -- ユーザに紐付いている経路の実行状況や車の情報を取得する

# 書式

## HTTP ヘッダ

```http
POST /monitorCar HTTP/1.1
Host: http://sazasub.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名   | 値の型   | 値の内容                     |
| -------- | -------- | ---------------------------- |
| `userId` | `string` | API を利用するユーザの識別子 |

# 解説

**`monitorCar`** API は
ユーザに紐付いた経路の実行状況や車の情報を取得します。

# 応答

**`monitorCar`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型         | 値の内容                                            |
| ----------- | -------------- | --------------------------------------------------- |
| `succeeded` | `boolean`      | 取得に成功した場合に `true`                         |
| `reason`    | `string`       | 取得に失敗した理由（失敗時）                        |
| `reserve`   | `boolean`      | 車の割り当てがある場合に `true`（以下成功時）       |
| `route`     | `Position[][]` | 実行中の経路（経路実行時）                          |
| `dest`      | `Position[]`   | 実行中の経路の停留所（経路実行時）                  |
| `arrival`   | `boolean`      | 車が停留所にいる場合に `true`（経路実行時）         |
| `finish`    | `boolean`      | 車が目的地にいる場合に `true`（経路実行時）         |
| `arrange`   | `boolean`      | 車が経路の始点に到着済の場合に `true`（経路実行時） |
| `status`    | `boolean`      | 車が正常状態である場合に `true`（車割当て時）       |
| `nowPoint`  | `Position`     | 車の現在位置（車割当て時）                          |
| `battery`   | `number`       | 車の電池残量（%; [0,100]）（車割当て時）            |

# 診断

エラー時に返される JSON の `reason` メンバの値は次の通りです。

| `reason` メンバの値 | エラー内容                         |
| ------------------- | ---------------------------------- |
| `Invalid request.`  | 不正なリクエストです。             |
| `Illegal user.`     | リクエストされたユーザが無効です。 |

# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれたものを元に
[KusaReMKN][kusaremkn] によって書かれました。

# バグ

応答文の JSON が表すオブジェクトの `succeeded` メンバが `false` の場合、
API の呼び出しが正常に行われ実行不可能を示しているのか
API の呼び出しそのものに失敗しているのかを判別する方法がありません。

応答文の JSON が表すオブジェクトの `dest` メンバは
`route` メンバから算出可能であり、完全に冗長です。

応答文から与えられる情報のみでは実行中の経路が巡回経路であるか判別できません。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
