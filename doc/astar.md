---
title: astar
subtitle: Manki API Reference Manual
author:
  - [Takatomo0424]
  - [KusaReMKN]
---

# 名称

**`astar`** -- 地点を通るルートを探索する

# 書式

## HTTP ヘッダ

```http
POST /astar HTTP/1.1
Host: http://api.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名   | 値の型       | 値の内容                               |
| -------- | ------------ | -------------------------------------- |
| `userId` | `string`     | API を利用するユーザの識別子           |
| `data`   | `Position[]` | 生成されるルートが通るべき地点のリスト |

# 解説

**`astar`** API は
指定された地点を通るルートを探索します。
ここで、`data` で指定される地点は
1 個の始点、0 個以上の中継点、1 個の終点を持つ必要があります
（つまり、`data.length` は 2 以上です）。

# 応答

**`astar`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型       | 値の内容                     |
| ----------- | ------------ | ---------------------------- |
| `succeeded` | `boolean`    | 探索に成功した場合に `true`  |
| `reason`    | `string`     | 探索の失敗した理由（失敗時） |
| `route`     | `Position[]` | 探索されたルート（成功時）   |

# 診断

エラー時に返される JSON の `reason` メンバは
探索の失敗の原因を特定するために有用な情報を持っているかもしれません。
このメッセージは人間が読める形式ですが、デバッグ用途を想定しており、
ユーザインターフェースに直接表示するためのものではありません。

| `reason` メンバの値                           | エラー内容                          |
| --------------------------------------------- | ----------------------------------- |
| `Invalid request.`                            | 不正なリクエストです。              |
| `Illegal user.`                               | リクエストされたユーザが無効です。  |
| `passablePoint does not exist.`               | 通行可能領域が存在しません。        |
| `Destination ~ is outside the passable area.` | 地点 ~ が通行可能領域外にあります。 |
| `Destination ~ could not be reached.`         | 地点 ~ に到達できませんでした。     |
| `The end point could not be reached.`         | 目的地に到達できませんでした。      |
| その他                                        | 例外により catch されたエラーです。 |

# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれ、
そのうち **`astar`** API の大部分は [Takatomo0424][takatomo0424] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれたものを元に
[KusaReMKN][kusaremkn] によって書かれました。

# バグ

**`astar`** API が応答するまでに長い時間（数十秒以上）を要する場合があります。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
