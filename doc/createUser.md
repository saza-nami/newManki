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
Host: http://sazasub.kohga.local
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

| キー名      | 値の型    | 値の内容                                          |
| ----------- | --------- | ------------------------------------------------- |
| `succeeded` | `boolean` | 発行に成功した場合に `true`                       |
| `userId`    | `string`  | 発行されたユーザ識別子（成功時）                  |


# 診断

今のところ、エラーの原因を特定するために有用な情報は提供されていません。


# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)


# 作者

Manki API の大部分は [saza-nami] によって書かれました。
この文書は [Takatomo0424] によって書かれたものを元に
[KusaReMKN] によって書かれました。


# バグ

一度発行されたユーザ識別子を再現する方法はありません。


[saza-nami]:	https://github.com/saza-nami
[Takatomo0424]:	https://github.com/Takatomo0424
[KusaReMKN]:	https://github.com/KusaReMKN
