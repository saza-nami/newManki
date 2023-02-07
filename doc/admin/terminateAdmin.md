---
title: terminateAdmin
subtitle: Manki API for Administrator Reference Manual
author:
  - [Takatomo0424]
---

# 名称

**`terminateAdmin`** -- 管理者の識別子を無効にする

# 書式

## HTTP ヘッダ

```http
POST /terminateAdmin HTTP/1.1
Host: http://api.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名    | 値の型   | 値の内容                     |
| --------- | -------- | ---------------------------- |
| `adminId` | `string` | API を利用する管理者の識別子 |

# 解説

**`terminateAdmin`** API は

指定された管理者の識別子を無効にします。

# 応答

**`manageCar`** API は

次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                     |
| ----------- | --------- | ---------------------------- |
| `succeeded` | `boolean` | 処理に成功した場合に `true`  |
| `reason`    | `string`  | 処理に失敗した理由（失敗時） |

# 診断

エラー時に返される JSON の `reason` メンバは次の通りです。

| `reason` メンバの値 | エラー内容                          |
| ------------------- | ----------------------------------- |
| `Invalid request.`  | 不正なリクエストです。              |
| `Illegal admin.`    | リクエストされた管理者が無効です。  |
| その他              | 例外により catch されたエラーです。 |

# 関連項目

- Manki API for Administrator Refernce Manual の **intro**
- Manki for Administrator Programmer's Manual の **API**(3)

# 作者

Manki API for Administrator の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれました。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
