# 覆盖清单与路线

状态：2026-09-30 初始版。下面的“结构化”表示相应分支已写为 SNF，**不表示经过数据库执行测试或完整支持整条语句**。每个文件首行的官方链接为逐项来源；额外来源见 [sources.md](sources.md)。

| 文件 | 已结构化 | 主要缺口/约束 |
| --- | --- | --- |
| query/select.snf | CTE；ALL/DISTINCT；普通/TOP/TOP WITH TIES/OFFSET FETCH；INTO；基础 JOIN/APPLY；WHERE/GROUP/HAVING/ORDER | UNION/INTERSECT/EXCEPT、WINDOW 定义、ROLLUP/CUBE/GROUPING SETS、FOR XML/JSON、OPTION、PIVOT/UNPIVOT、表提示、TVF/OPENJSON/OPENROWSET、时态查询待展开；表达式为自由输入 |
| query/insert.snf | VALUES 多行、SELECT 来源、DEFAULT VALUES；TOP；OUTPUT | INSERT EXEC、嵌套 DML、表提示、远程目标未展开；VALUES 直接插入最多 1000 行，列值数量须匹配 |
| query/update.snf | 普通/复合列赋值；TOP；OUTPUT；FROM；WHERE | from_expression 目前为上下文自由输入；变量/链式赋值、UDT、.WRITE、CURRENT OF、提示和 OPTION 未展开 |
| query/delete.snf | TOP；目标/第二个 FROM；OUTPUT；WHERE | from_expression 为上下文自由输入；CURRENT OF、表提示、OPTION 未展开 |
| create/table.snf | 磁盘表、普通/计算列、IDENTITY、DEFAULT、空性、ROWGUIDCOL、PK/UNIQUE/FK/CHECK、filegroup | 类型为自由输入；分区、内存表、列存、内嵌索引、稀疏列、时态、ledger、加密、masking、FileTable/FILESTREAM、压缩选项未展开；约束组合仍需语义检查 |
| create/index.snf | 行存 clustered/nonclustered、UNIQUE、INCLUDE、过滤条件、常见 WITH 选项、filegroup | ONLINE/RESUMABLE、低优先级锁、分区、压缩、列存/XML/空间/fulltext/vector 索引未展开；过滤表达式受限，非任意 WHERE |
| create/view.snf | CREATE OR ALTER、列名、三个属性、查询、CHECK OPTION | 查询合法性及 batch-first 由消费方检查；INTO/OPTION/临时对象不能用于视图定义 |
| create/schema.snf | 命名/仅 AUTHORIZATION 两种入口 | 内嵌 CREATE TABLE/VIEW、GRANT/REVOKE/DENY 未展开 |
| create/sequence.snf | 类型、起点、步长、上下界、循环、缓存 | 仅允许符合官方规则的整数类型/值，不允许任意 data_type |
| create/synonym.snf | CREATE SYNONYM FOR 基对象 | 基对象名称允许部件数取决于对象类别 |
| alter/table.snf | ADD 普通列、ALTER COLUMN、DROP COLUMN/CONSTRAINT、CHECK/NOCHECK | ADD 约束、计算列、IDENTITY、新型表、分区 SWITCH、REBUILD、完整列属性与选项待补 |
| alter/index.snf | REBUILD、REORGANIZE、DISABLE | 分区及 REBUILD/SET 的完整选项、RESUME/PAUSE/ABORT 待补 |
| alter/sequence.snf | 重启、步长、上下界、循环、缓存 | 多选项约束与数值合法性由语义层检查 |
| drop/table.snf | IF EXISTS、列表 | 依赖/外键/ledger 行为不由语法保证 |
| drop/view.snf | IF EXISTS、列表 | 依赖和权限检查 |
| drop/sequence.snf | IF EXISTS、列表 | 依赖和权限检查 |
| drop/synonym.snf | IF EXISTS、单对象 | SQL Server 的 DROP SYNONYM 不是列表 |
| drop/procedure.snf | IF EXISTS、列表 | CREATE/ALTER PROCEDURE 本轮未收录 |
| drop/function.snf | IF EXISTS、列表 | CREATE/ALTER FUNCTION 本轮未收录 |
| drop/schema.snf | IF EXISTS、单对象 | schema 为空等数据库状态检查 |
| drop/index.snf | IF EXISTS、多个 name ON table | 旧式 table.index 以及 clustered DROP 的移动/在线选项未展开 |
| transaction/begin.snf | TRAN/TRANSACTION、名称、WITH MARK | 分布式事务未收录；WITH MARK 需要事务名，描述输入必须转义 |
| transaction/commit.snf | TRAN/TRANSACTION、WORK、DELAYED_DURABILITY | 事务嵌套、durability 配置效果由数据库决定 |
| transaction/rollback.snf | 整体回滚、事务/保存点目标、WORK | 没有 PostgreSQL ROLLBACK TO；分布式事务不支持保存点 |
| transaction/save.snf | SAVE TRAN/TRANSACTION | 名称、变量以及事务状态由消费方校验 |
| transaction/set-isolation-level.snf | 五种隔离级别 | SNAPSHOT 需要数据库配置；不因此自动更改数据库设置 |
| other/truncate-table.snf | 整表/分区范围 | 对齐索引、FK、复制等限制不由 SNF 校验 |
| other/use.snf | USE database | 不作为 Azure SQL 跨库切换语法 |
| other/set.snf | 常用布尔会话选项、IDENTITY_INSERT | 非全部 SET；部分旧 SET OFF 取值已弃用或由引擎强制，见官方每项说明 |

## 已落实的关键规则

1. SELECT 的 ALL/DISTINCT 在 TOP 前，INTO 在投影列表后
2. TOP 和 OFFSET/FETCH 分 CASE，同一层不组合；WITH TIES CASE 必有 ORDER BY
3. DML 的 TOP 有圆括号，没有直接 ORDER BY 或 WITH TIES
4. INSERT 的 OUTPUT 在 VALUES/SELECT 前，UPDATE 在 SET 后，DELETE 在 FROM 来源前
5. OUTPUT 支持单独返回、INTO、INTO 后再次返回；INSERTED/DELETED 按语句区分；没有误加 MERGE 专属 $action
6. 不收录 Fabric 的 QUALIFY、ORDER BY ALL；GO 不视为 SQL

## 尚不能表达的语义

见 [placeholders.md](placeholders.md)。递归查询和自由表达式的上下文限制不由当前 SNF 或 parser 自动校验。INTO、ORDER BY、CTE、OUTPUT、索引过滤条件、数据类型组合、对象权限及状态需要消费方和 SQL Server 验证。

## 后续顺序

- P1：按上述缺口补 SELECT 集合操作、窗口、FOR/OPTION、FROM 族；补 DML 表提示及 MERGE，保留 MERGE 必需终止分号和分支互斥规则
- P1：建 parser 指令绑定集成与正/负 SQL 示例集；用户主动验证后再接入 CI，不先宣称“解析通过”
- P2：补表/索引完整选项及数据类型、表达式/内建函数，单独追踪 2025 的 JSON、正则、vector GA 子集等新增点与兼容级别
- P2：过程、函数、触发器、类型、数据库/用户/角色，以及 GRANT/DENY/REVOKE、ALTER AUTHORIZATION
- P2：分区函数/分区方案的 CREATE/ALTER/DROP；SPLIT/MERGE 属于 ALTER PARTITION FUNCTION，不属于 ALTER TABLE
- P3：备份恢复、DBCC、数据库设置、管理/维护语句；分别标明平台和 edition 约束
- Preview：只在官方转 GA 后升级默认基线；若需要试验版，独立标记范围，不混进通用分支

这些是整理路线，未自动创建 GitHub issues 或宣布后续已完成。
