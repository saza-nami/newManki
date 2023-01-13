---
title: sendCarInfo
subtitle: Manki API Reference Manual
author:
  - [saza-nami]
---

# 名称

**`sendCarInfo`** -- 対車両通信を行う

# 書式

## HTTP ヘッダ

```http
POST /sendCarInfo HTTP/1.1
Host: http://sazasub.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名     | 値の型     | 値の内容                                                             |
| ---------- | ---------- | -------------------------------------------------------------------- |
| `request`  | `string`   | API に要求する内容                                                   |
| `location` | `Position` | 車の現在地                                                           |
| `battery`  | `number`   | 車のバッテリー残量                                                   |
| `carId`    | `string`   | API を利用する車の識別子（`resuest = "hello"` の時は不要）           |
| `sequence` | `number`   | API を利用する車のシークエンス番号（`request = "hello"` の時は不要） |

# 解説

`sendCarInfo` API は

`request` で指定された操作をし、車両と通信を行います。

ここで、`request` の種類には以下の 4 つがあります。

- `hello` : `carId` 発行要求
- `ping` : 生存報告
- `next` : 次に向かう地点の要求
- `halt` : 異常発生報告

## 応答

`sendCarInfo` API は

次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名        | 値の型     | 値の内容                                              |
| ------------- | ---------- | ----------------------------------------------------- |
| `succeeded`   | `boolean`  | 操作に成功した場合に `true`                           |
| `reason`      | `string`   | 操作に失敗した理由（失敗時）                          |
| `responce`    | `string`   | 操作に対する応答（成功時）                            |
| `sequence`    | `number`   | 次のシークエンス番号（成功時）                        |
| `destination` | `Position` | 次に向かう地点情報（成功時・`request = "next"` の時） |

`response` の内容は JSON の内容の `request` によって変化します。

- `request = "hello"` : 発行した `carId` が返ります。
- `request = "ping"` : 車が割り当てられていないときは `stop, halt` 、車が割り当てられている時は `stop, next, pong, halt` のいずれかが返ります。
- `request = "next"` : 車の状態に応じて `next, stop, halt` のいずれかが返ります。
- `request = "halt"` : `halt` が返ります。

また、レスポンスの意味は以下の通りです。

- `carId` : 車の識別子
- `stop` : 停止せよ
- `next` : 次の地点に進め
- `pong` : 現在の動作を継続せよ
- `halt` : 異常状態 通告・了解

# 診断

エラー時に返される JSON の `reason` メンバの値は次の通りです。

| `reason` メンバの値 | エラー内容                 |
| ------------------- | -------------------------- |
| `Invalid request.`  | 不正なリクエストです。     |
| `request error.`    | リクエスト内容が不正です。 |
| `auth error.`       | 車の認証に失敗しました。   |

# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [saza-nami][saza-nami] によって書かれました。

# バグ

見つかり次第追記します。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
