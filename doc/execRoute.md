---
title: execRoute
subtitle: Manki API Reference Manual
author:
- Takatomo0424
- KusaReMKN
---

# 名称

**`execRoute`** -- 新しい経路の実行を予約する


# 書式

## HTTP ヘッダ

```http
POST /execRoute HTTP/1.1
Host: http://sazasub.kohga.local
Accept: application/json; charset=utf-8
Origin: http://www.kohga.local
Content-Type: application/json; charset=utf-8
```

## JSON の内容

| キー名   | 値の型         | 値の内容                                        |
| -------- | -------------- | ----------------------------------------------- |
| `userId` | `string`       | API を利用するユーザの識別子                    |
| `data`   | `Position[][]` | 実行する経路                                    |
| `junkai` | `boolean`      | 巡回経路のときに真                              |


# 解説

**`execRoute`** API は
指定された経路の実行を予約します。
ここで、`data` で指定される経路は、1 個の以上のルートを持つ必要があります
(つまり、`data.length` は 1 以上です）。
また、それぞれのルートは
1 個の始点、0 個以上の中継点、1 個の終点を持つ必要があります
（つまり、`data.reduce((l, r) => Math.min(r.length, l), Number.MAX_VALUE)` は
2 以上です）。


# 応答

**`execRoute`** API は
次の要素を持つオブジェクトを表す JSON 文字列を応答します。

| キー名      | 値の型    | 値の内容                                          |
| ----------- | --------- | ------------------------------------------------- |
| `succeeded` | `boolean` | 予約に成功した場合に `true`                       |
| `message`   | `string`  | 予約に失敗した理由（失敗時）                      |


# 診断

エラー時に返される JSON の `message` メンバの値は次の通りです。

| `message` メンバの値 | エラー内容                                           |
| -------------------- | ---------------------------------------------------- |
| `unreachable!`       | 指定された経路は到達できません。                     |
| `Reject new order!`  | ユーザは別の実行中の経路を持っています。             |


# 関連項目

- Manki API Refernce Manual の **intro**
- Manki Programmer's Manual の **API**(3)


# 作者

Manki API の大部分は [saza-nami] によって書かれました。
この文書は [Takatomo0424] によって書かれたものを元に
[KusaReMKN] によって書かれました。


# バグ

今のところ、経路を即座に実行する方法は提供されていません。


[saza-nami]:	https://github.com/saza-nami
[Takatomo0424]:	https://github.com/Takatomo0424
[KusaReMKN]:	https://github.com/KusaReMKN
