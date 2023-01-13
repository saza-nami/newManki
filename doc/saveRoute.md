---
title: saveRoute
subtitle: Manki API Reference Manual
author:
  - Takatomo0424
  - KusaReMKN
---

# 名称

**`saveRoute`** -- 経路に名前を付けて保存する

# 書式

## HTTP ヘッダ

```http
POST /saveRoute HTTP/1.1
Host: http://sazasub.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名      | 値の型         | 値の内容                     |
| ----------- | -------------- | ---------------------------- |
| `userId`    | `string`       | API を利用するユーザの識別子 |
| `routeName` | `string`       | 経路に付ける名前             |
| `data`      | `Position[][]` | 保存する経路                 |
| `junkai`    | `boolean`      | 巡回経路のときに真           |

# 解説

**`saveRoute`** API は
指定された経路に `routeName` で指定される名前を付けて保存します。
ここで、`data` で指定される経路は、1 個の以上のルートを持つ必要があります
(つまり、`data.length` は 1 以上です）。
また、それぞれのルートは
1 個の始点、0 個以上の中継点、1 個の終点を持つ必要があります
（つまり `data.reduce((r, c) => Math.min(r.length, c), Number.MAX_VALUE)` は
2 以上です）。

# 応答

**`saveRoute`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                                 |
| ----------- | --------- | ---------------------------------------- |
| `succeeded` | `boolean` | 保存に成功した場合に `true`              |
| `reason`    | `string`  | 保存に失敗した理由（失敗時）             |
| `routeName` | `string`  | 保存された経路に付けられた名前（成功時） |

# 診断

エラー時に返される JSON の `reason` メンバの値は
経路に含まれる問題を特定するために有用な情報を持っているかもしれません。
このメッセージは人間が読める形式ですが、デバッグ用途を想定しており、
ユーザインタフェースに直接表示するためのものではありません。

| `reason` メンバの値                           | エラー内容                                   |
| --------------------------------------------- | -------------------------------------------- |
| `Invalid request.`                            | 不正なリクエストです。                       |
| `Illegal user.`                               | リクエストされたユーザが無効です。           |
| `RouteNo. ~ PointNo. ~ could not be reached.` | ルート  ~ の地点 ~  に到達できませんでした。 |

# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれたものを元に
[KusaReMKN][kusaremkn] によって書かれました。

# バグ

思い当たりません。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
