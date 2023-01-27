---
title: createUser
subtitle: Manki API Reference Manual
author:
  - Takatomo0424
  - KusaReMKN
---

# 名称

**`createUser`** -- 新しいユーザ識別子を発行する

# 書式

## HTTP ヘッダ

```http
GET /createUser HTTP/1.1
Host: http://api.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
```

# 解説

**`createUser`** API は
Manki サービスを利用するための新しいユーザ識別子を発行します。
Manki サービスを同時に利用できるユーザ数には制限があるため、
制限値を超える場合には発行できません（失敗します）。
また、短時間に多量のユーザ識別子を発行しようとする場合にも失敗します。

# 応答

**`createUser`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                         |
| ----------- | --------- | -------------------------------- |
| `succeeded` | `boolean` | 発行に成功した場合に `true`      |
| `reason`    | `string`  | 発行に失敗した理由（失敗時）     |
| `userId`    | `string`  | 発行されたユーザ識別子（成功時） |

# 診断

エラー時に返される JSON の `reason` メンバの値は次の通りです。

| `reason` メンバの値                        | エラー内容                                       |
| ------------------------------------------ | ------------------------------------------------ |
| `Please allow some time and access again.` | しばらく待ってから再度アクセスしてください。     |
| `User creation failed.`                    | システムに問題があり、ユーザ作成に失敗しました。 |
| `Users exceeded the limit.`                | 利用中のユーザ数が制限を超えました。             |
| その他                                     | 例外により catch されたエラーです。              |

# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)

# 作者

Manki API の大部分は [saza-nami][saza-nami] によって書かれました。
この文書は [Takatomo0424][takatomo0424] によって書かれたものを元に
[KusaReMKN][kusaremkn] によって書かれました。

# バグ

一度発行されたユーザ識別子を再現する方法はありません。

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
