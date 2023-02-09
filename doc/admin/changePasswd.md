---
title: changePasswd
subtitle: Manki API for Administrator Reference Manual
author:
  - [Takatomo0424]
---
# 名称

**`changePasswd`** -- 管理者のパスワードを変更する

# 書式

## HTTP ヘッダ

```http
POST /changePasswd HTTP/1.1
Host: http://api.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名            | 値の型     | 値の内容                     |
| ----------------- | ---------- | ---------------------------- |
| `adminId`       | `string` | API を利用する管理者の識別子 |
| `currentPasswd` | `string` | 管理者パスワード             |
| `newPasswd`     | `string` | 変更後の管理者パスワード     |

# 解説

**`changePasswd`** API は

指定された管理者のパスワードを `newPasswd` に変更します。

# 応答

**`changePasswd`** API は

次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名        | 値の型      | 値の内容                      |
| ------------- | ----------- | ----------------------------- |
| `succeeded` | `boolean` | 変更に成功した場合に `true` |
| `reason`    | `string`  | 処理に失敗した理由（失敗時）  |

# 診断

エラー時に返される JSON の `reason` メンバは次の通りです。

| `reason` メンバの値             | エラー内容                          |
| --------------------------------- | ----------------------------------- |
| `Invalid request.`              | 不正なリクエストです。              |
| `No such administrator exists.` | リクエストされた管理者が無効です。  |
| `Your password is wrong.`       | 管理者パスワードが間違っています。  |
| その他                            | 例外により catch されたエラーです。 |

# 関連項目

- Manki API for Administrator Refernce Manual の **intro**
- Manki for Administrator Programmer's Manual の **API**(3)

# 作者

Manki API for Administrator の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれ、[saza-nami][saza-nami] によって修正されました。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
