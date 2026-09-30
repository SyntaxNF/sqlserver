# 来源与版本维护

核对日期：2026-09-30。每个 .snf 首行链接对应官方说明，统一使用 view=sql-server-ver17。该参数不意味着页面中每段语法都属于 SQL Server；必须选择 SQL Server Database Engine 段落。

## 基线

- [SQL Server 2025 GA 公告，2025-11-18](https://techcommunity.microsoft.com/blog/SQLServer/sql-server-2025-is-now-generally-available/4470570)
- [SQL Server 2025 发布说明及预览清单](https://learn.microsoft.com/en-us/sql/sql-server/sql-server-2025-release-notes?view=sql-server-ver17)
- [新增功能](https://learn.microsoft.com/en-us/sql/sql-server/what-s-new-in-sql-server-2025?view=sql-server-ver17)
- [Build / CU 历史](https://learn.microsoft.com/en-us/troubleshoot/sql/releases/sqlserver-2025/build-versions)
- [兼容级别](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-database-transact-sql-compatibility-level?view=sql-server-ver17)
- [Edition 功能区别](https://learn.microsoft.com/en-us/sql/sql-server/editions-and-components-of-sql-server-2025?view=sql-server-ver17)
- [JSON 数据类型，当前 GA 状态](https://learn.microsoft.com/en-us/sql/t-sql/data-types/json-data-type?view=sql-server-ver17)

## 查询/DML 补充

- [TOP](https://learn.microsoft.com/en-us/sql/t-sql/queries/top-transact-sql?view=sql-server-ver17)
- [ORDER BY / OFFSET FETCH](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql?view=sql-server-ver17)
- [OUTPUT](https://learn.microsoft.com/en-us/sql/t-sql/queries/output-clause-transact-sql?view=sql-server-ver17)
- [CTE](https://learn.microsoft.com/en-us/sql/t-sql/queries/with-common-table-expression-transact-sql?view=sql-server-ver17)
- [WINDOW（待展开，不代表不受支持）](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-window-transact-sql?view=sql-server-ver17)
- [值构造器](https://learn.microsoft.com/en-us/sql/t-sql/queries/table-value-constructor-transact-sql?view=sql-server-ver17)

## SNF 参照

- [Parser README](https://github.com/SyntaxNF/parser/blob/bcf2c3ac58b45e7d5391716393586b00b11e0c1a/README.md)：块 AST、转义与注释不透明性
- [PostgreSQL AGENTS](https://github.com/SyntaxNF/postgresql/blob/main/AGENTS.md)：命名、组织与主动测试边界
- [MySQL CREATE TABLE](https://github.com/SyntaxNF/mysql/blob/main/create/table.snf)：CASE/WHERE/PARTOFIS/ONEOFIS 布局
- [Oracle README](https://github.com/SyntaxNF/oracle/blob/main/README.md)：定义和消费方职责边界

升级时逐项记录官方变更、GA/preview 状态、edition/platform/compatibility 约束，更新 coverage 与受影响定义；不要仅替换页面版本参数就宣布支持下一版本。
