---
title: reqCarInfo
subtitle: Manki API for Administrator Reference Manual
author:
  - [Takatomo0424]
---
# 名称

**`reqCarInfo`** -- 車情報を取得する

# 書式

## HTTP ヘッダ

```http
POST /reqCarInfo HTTP/1.1
Host: http://api.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名      | 値の型     | 値の内容                     |
| ----------- | ---------- | ---------------------------- |
| `adminId` | `string` | API を利用する管理者の識別子 |

# 解説

**`reqCarInfo`** API は車情報を取得します。

# 応答

**`reqCarInfo`** API は

次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名              | 値の型        | 値の内容                      |
| ------------------- | ------------- | ----------------------------- |
| `succeeded`       | `boolean`   | 処理に成功した場合に `true` |
| `reason`          | `string`    | 処理失敗した理由（失敗時）    |
| `carInformations` | `CarInfo[]` | 車情報（成功時）              |

`CarInfo` 型は以下の情報を持ちます。

- `carId` : 車識別子のことです。
- `status` : 車の状態のことです。車の状態には以下の 6 つがあります。

| statusNo. | status                                                                          |
| --------- | ------------------------------------------------------------------------------- |
| 1         | 暇状態 : 車がどのユーザにも割り当てられていない状態                             |
| 2         | 待ち状態 : 車がユーザに割り当てられていて、経路が実行されていない状態           |
| 3         | 実行中・走行状態 : 車がユーザに割り当てられていて、経路を実行中かつ走行中の状態 |
| 4         | 実行中・停止状態 : 車がユーザに割り当てられていて、経路を実行中かつ停止中の状態 |
| 5         | 確認されていない異常状態: 車に異常が発生していて、管理者が認知していない状態    |
| 6         | 確認された異常状態 : 車に異常が発生していて、管理者が認知している状態           |

- `nowPoint` : 車の現在地のことです。
- `battery` : 車のバッテリー残量です。
- `lastAt` : 車の最終通信時刻です。
  `lastAt` は `Www, dd Mmm yyyy hh:mm:ss GMT` の形の文字列です。
  書式文字列については以下の通りです。

> | 書式文字列 | 説明                                                   |
> | ---------- | ------------------------------------------------------ |
> | `Www`    | 曜日、3 文字で表す (例 Sun, Mon, ...)                  |
> | `dd`     | 日、必要に応じて先頭に 0 が付いた 2 桁の数字で表す     |
> | `Mmm`    | 月、3 文字で表す (例 Jan, Feb, ...)                    |
> | `yyyy`   | 年、必要に応じて先頭に 0 が付いた 4 桁以上の数字で表す |
> | `hh`     | 時、必要に応じて先頭に 0 が付いた 2 桁の数字で表す     |
> | `mm`     | 分、必要に応じて先頭に 0 が付いた 2 桁の数字で表す     |
> | `ss`     | 秒、必要に応じて先頭に 0 が付いた 2 桁の数字で表す     |
>
> Date.prototype.toUTCString() - Javascript | MDN より引用

# 診断

エラー時に返される JSON の `reason` メンバは次の通りです。

| `reason` メンバの値 | エラー内容                          |
| --------------------- | ----------------------------------- |
| `Invalid request.`  | 不正なリクエストです。              |
| `Illegal admin.`    | リクエストされた管理者が無効です。  |
| その他                | 例外により catch されたエラーです。 |

# 関連項目

- Manki API for Administrator Refernce Manual の **intro**
- Manki for Administrator Programmer's Manual の **API**(3)

# 作者

Manki API for Administrator の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれ、[saza-nami][saza-nami] によって修正されました。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
