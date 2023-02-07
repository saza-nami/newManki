---
title: endRoute
subtitle: Manki API Reference Manual
author:
  - Takatomo0424
  - KusaReMKN
---

# 名称

**`endRoute`** -- ユーザに紐付けられている経路の実行をキャンセルする

# 書式

## HTTP ヘッダ

```http
POST /endRoute HTTP/1.1
Host: http://api.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名   | 値の型   | 値の内容                     |
| -------- | -------- | ---------------------------- |
| `userId` | `string` | API を利用するユーザの識別子 |

# 解説

**`endRoute`** API は
ユーザに紐付けられている経路の実行をキャンセルします。
ユーザに紐付けられている経路の実行が存在しない場合や
経路の実行が既に終了している場合には黙って成功します。

# 応答

**`endRoute`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                           |
| ----------- | --------- | ---------------------------------- |
| `succeeded` | `boolean` | キャンセルに成功した場合に `true`  |
| `reason`    | `string`  | キャンセルに失敗した理由（失敗時） |

# 診断

エラー時に返される JSON の `reason` メンバの値は次の通りです。

| `reason` メンバの値 | エラー内容                          |
| ------------------- | ----------------------------------- |
| `Invalid request.`  | 不正なリクエストです。              |
| `Illegal user.`     | リクエストされたユーザが無効です。  |
| その他              | 例外により catch されたエラーです。 |

# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれたものを元に
[KusaReMKN][kusaremkn] によって書かれました。

# バグ

応答文の JSON が表すオブジェクトの `succeeded` メンバが `false` の場合、
API の呼び出しが正常に行われ処理中にエラーが発生しているのか
API の呼び出しそのものに失敗しているのかを判別する方法がありません。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
