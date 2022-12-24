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
Host: http://sazasub.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名   | 値の型   | 値の内容                                              |
| -------- | -------- | ----------------------------------------------------- |
| `userId` | `string` | API を利用するユーザの識別子                          |


# 解説

**`isAcceptable`** API は
ユーザが新しく経路を実行可能か調べます。


# 応答

**`isAcceptable`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                                          |
| ----------- | --------- | ------------------------------------------------- |
| `succeeded` | `boolean` | 実行可能な場合に `true`                           |


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

応答文の JSON が表すオブジェクトの `succeeded` メンバが `false` の場合、
API の呼び出しが正常に行われ実行不可能を示しているのか
API の呼び出しそのものに失敗しているのかを判別する方法がありません。


[saza-nami]:	https://github.com/saza-nami
[Takatomo0424]:	https://github.com/Takatomo0424
[KusaReMKN]:	https://github.com/KusaReMKN
