---
title: loginAdmin
subtitle: Manki API for Administrator Reference Manual
author:
  - [Takatomo0424]
---

# 名称

**`loginAdmin`** -- 管理者識別子を発行する

# 書式

## HTTP ヘッダ

```http
POST /astar HTTP/1.1
Host: http://sazasub.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名      | 値の型   | 値の内容         |
| ----------- | -------- | ---------------- |
| `adminName` | `string` | 管理者名         |
| `adminPass` | `string` | 管理者パスワード |

# 解説

`loginAdmin` API は指定された管理者から管理者識別子を発行します。

# 応答

**`loginAdmin`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                     |
| ----------- | --------- | ---------------------------- |
| `succeeded` | `boolean` | 発行に成功した場合に `true`  |
| `reason`    | `string`  | 発行に失敗した理由（失敗時） |
| `adminId`   | `string`  | 管理者識別子（成功時）       |

# 診断

エラー時に返される JSON の `reason` メンバは次の通りです。

| `reason` メンバの値       | エラー内容                          |
| ------------------------- | ----------------------------------- |
| `Invalid request.`        | 不正なリクエストです。              |
| `Your neme is wrong.`     | 管理者名が間違っています。          |
| `Your password is wrong.` | 管理者パスワードが間違っています。  |
| その他                    | 例外により catch されたエラーです。 |

# 関連項目

- Manki API for Administrator Refernce Manual の **intro**
- Manki for Administrator Programmer's Manual の **API**(3)

# 作者

Manki API for Administrator の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれました。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
