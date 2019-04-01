---
layout: post
title: Python 访问 HBase
======

使用 Python 通过 phoenixdb 访问 HBase，一个简单的 phoenixdb 快速入门指南。

# 前言
---

Python 访问 HBase 可以通过如下两种方式访问。
1. HBase 数据库，通过 happybase 可以直接访问 Habse，通过 phoenix 可以使用类 SQL 形式访问 HBase。
2. 通过 phoenixdb 访问 HBase 时需要访问启动了 Phoenix Query Servers 的服务器地址。

## Phoenix 简介

Phoenix 查询引擎支持使用 SQL 进行 HBase 数据的查询，会将 SQL 查询转换为一个或多个 HBase API，协同处理器与自定义过滤器的实现，并编排执行。使用 Phoenix 进行简单查询，其性能量级是毫秒。

## 数据库连接

通过 Python 的软件包 phoenixdb 连接 HBase 数据库时，请先确认是否启动了 Phoenix Query Servers 服务。如果没有提示错误信息，即连接成功。
```python
#!/usr/bin/env python3.6
import phoenixdb
import phoenixdb.cursor

if __name__ == '__main__':
    database_url = 'http://192.168.3.73:8765/'
    conn = phoenixdb.connect(database_url, autocommit=True)
```

## 创建一个数据表

通过以下语句可以创建一个 us_population 数据表，定义表的数据结构以及主键。基本的 SQL 语句，但是创建多个主键时使用如下语句会失败。
```sql
CREATE TABLE IF NOT EXISTS us_population (
   state CHAR(2) NOT NULL,
   city VARCHAR NOT NULL,
   population BIGINT
   CONSTRAINT my_pk PRIMARY KEY (state, city));
```

所以只好自己创建一个主键了，然后手动维护该主键。
```sql
CREATE TABLE IF NOT EXISTS us_population (
    mykey integer not null primary key,
    state CHAR(2), city VARCHAR,
    population BIGINT);
```

Python 代码如下：
```python
#!/usr/bin/env python3.6
import phoenixdb
import phoenixdb.cursor

if __name__ == '__main__':
    database_url = 'http://192.168.3.73:8765/'
    conn = phoenixdb.connect(database_url, autocommit=True)

    cursor = conn.cursor()
    cursor.execute(
        'CREATE TABLE IF NOT EXISTS us_population ('
        'mykey integer not null primary key,'
        'state CHAR(2), city VARCHAR,'
        'population BIGINT)')

```

## 写入数据

与 sql 插入语句 INSERT INTO 不同，在 Phoenix 里通过 sql 语句 UPSERT INTO 可以向数据库中写入数据。
```sql
UPSERT INTO us_population VALUES('NY','New York',8143197);
```

Python 代码如下：
```python
#!/usr/bin/env python3.6
import phoenixdb
import phoenixdb.cursor

if __name__ == '__main__':
    database_url = 'http://192.168.3.73:8765/'
    conn = phoenixdb.connect(database_url, autocommit=True)

    cursor = conn.cursor()
    cursor.execute(
        "UPSERT INTO us_population VALUES (?, ?, ?, ?)",
        (1, 'NY', 'New York', 8143197))

```

值得注意的是 Phoenix 中不存在 update 的语法关键字，而是 upsert ，功能上替代了 Insert + update，所以只需要在 upsert 语句中制定存在的主键即可实现更新。

## 查询语句

查询数据库中数据，并打印查询结果
```python
    # 查询所有数据并打印
    cursor.execute("SELECT * FROM us_population")
    print(cursor.fetchall())

    # 按条件查询并打印某个元素
    cursor = conn.cursor(cursor_factory=phoenixdb.cursor.DictCursor)
    cursor.execute("SELECT * FROM us_population WHERE mykey=2")
    print(cursor.fetchone()['POPULATION'])

    # 分组查询并统计
    cursor.execute(
        'SELECT state as \"State\",count(city) as \"City Count\",'
        'sum(population) as \"Population Sum\" FROM us_population GROUP BY '
        'state ORDER BY sum(population) DESC')

```

## 修改数据表

向数据表中增加一列属性。
```python
    cursor.execute("ALTER TABLE us_population ADD country VARCHAR(10)")
```

## 删除数据及删除表

标准 sql 如下：
```sql
DELETE FROM us_population WHERE mykey=2;
DROP TABLE us_population;
```

Phoenix 中删除操作同标准 sql 一样。建议使用如下删除语句：
```python
    cursor.execute("DROP TABLE IF EXISTS us_population")
```
