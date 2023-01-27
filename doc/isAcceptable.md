---
title: isAcceptable
subtitle: Manki API Reference Manual
author:
  - Takatomo0424
  - KusaReMKN
---

# 名称

**`isAcceptable`** -- 新しい経路を実行可能か調べる

# 書式

## HTTP ヘッダ

```http
POST /isAcceptable HTTP/1.1
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

**`isAcceptable`** API は
ユーザが新しく経路を実行可能か調べます。

# 応答

**`isAcceptable`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                               |
| ----------- | --------- | -------------------------------------- |
| `succeeded` | `boolean` | 実行可能な場合に `true`                |
| `reason`    | `string`  | 新しい経路が実行できない理由（失敗時） |

# 診断

エラー時に返される JSON の `reason` メンバの値は次の通りです。

| `reason` メンバの値                                                                 | エラー内容                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `Invalid request.`                                                                  | 不正なリクエストです。                           |
| `Illegal user.`                                                                     | リクエストされたユーザが無効です。               |
| `A problem has occurred with the car being used. Please contact the administrator.` | 利用中の車に問題が発生しました。                 |
| `There is a problem with the system status. Please contact the administrator.`      | システム状態に問題があります。                   |
| `A new route cannot be created because the instruction is being executed.`          | 命令実行中のため、新しい経路を実行できません。   |
| `A new route cannot be created because a car assignment is in progress.`            | 車割り当て中のため、新しい経路を実行できません。 |
| その他                                                                              | 例外により catch されたエラーです。              |

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

[saza-nami]: https://github.com/saza-nami
[takatomo0424]: https://github.com/Takatomo0424
[kusaremkn]: https://github.com/KusaReMKN
