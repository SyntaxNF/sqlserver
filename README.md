# SQL Server SNF

整理 SQL Server 2025（17.x）Transact-SQL 的 SNF（Syntax Normal Form）定义，供阅读与 SQL 生成使用。当前是第一批可扩展定义，**不是完整 T-SQL 语法或 SQL 校验器，也尚未接入 Studio**。

## 版本与范围

- 核对日期：2026-09-30
- 最新 GA 主版本基线：[SQL Server 2025，17.x](https://techcommunity.microsoft.com/blog/SQLServer/sql-server-2025-is-now-generally-available/4470570)，2025-11-18 发布
- 面向独立 SQL Server Database Engine 的普通磁盘表与关系查询；Windows / Linux，Standard / Enterprise 及对应 Developer 版的公共语法子集，不声称所有版本/平台功能完全一致
- 目标数据库兼容级别 170；引擎版本和数据库兼容级别不同，升级不会保证现有数据库自动采用新级别
- 不收录 Azure SQL、Azure Synapse、Fabric 专属语法，不收录预览特性；同一 Microsoft Learn 页中的多产品段落必须分辨
- 这是主版本语法基线，不是“全部 CU 功能已验证”的承诺。版本更新记录见 [官方 build 列表](https://learn.microsoft.com/en-us/troubleshoot/sql/releases/sqlserver-2025/build-versions)

[发布说明](https://learn.microsoft.com/en-us/sql/sql-server/sql-server-2025-release-notes?view=sql-server-ver17)仍将部分向量检索/索引、半精度向量、模糊匹配和 change event streaming 标为预览，暂不纳入。原生 JSON 在当前文档中已 GA，但本轮尚未把类型和函数展开成独立语法；这属于覆盖缺口，不等于不支持该 SQL Server 特性。

## 目录

- query/：SELECT、INSERT、UPDATE、DELETE
- create/：表、行存索引、视图、schema、sequence、synonym
- alter/：表、索引、sequence
- drop/：上述常见对象及 procedure/function 删除
- transaction/：开始、提交、回滚、保存点、隔离级别
- other/：TRUNCATE、USE、常用 SET
- docs/：覆盖清单、自由输入契约、来源、验证与后续路线
- scripts/：用户主动运行的 SNF 结构检查

共 29 个 .snf 文件。每个文件首行是官方来源，完整清单及缺口见 [coverage](docs/coverage.md)。

## SNF 约定

沿用 [SyntaxNF/parser](https://github.com/SyntaxNF/parser)、[PostgreSQL](https://github.com/SyntaxNF/postgresql)、[MySQL](https://github.com/SyntaxNF/mysql)、[Oracle](https://github.com/SyntaxNF/oracle) 的组织方式：

- KEYWORD：SQL 关键字；placeholder：输入或需展开的节点
- [ syntax ]：可选；{ a | b }：必选分支；[ a | b ]：可选分支
- item [, ...]：逗号分隔列表；item [...]：重复前一项
- 圆括号为 SQL 字面符号；需输出 SNF 保留符号时使用反斜杠转义
- CASE 是语句变体；WHERE 定义节点；PARTOFIS 以空行分块列出候选；ONEOFIS 每物理行一个候选；STATEMENT 声明嵌套语句类别

这些注释指令是消费方约定。SNFDocumentParser 只解析块和 AST，不解析跨块引用，不会自动将 STATEMENT 下的 SELECT 展开成完整查询。集成方必须实现名称绑定、递归与作用域，并区分 [自由输入节点](docs/placeholders.md)。不能把未展开节点直接输出为 SQL。

## 重要边界

- SELECT 分开普通、TOP、TOP WITH TIES、OFFSET/FETCH，避免同一查询层混合 TOP 与 OFFSET
- WITH TIES 强制 ORDER BY；FETCH 只能跟在 OFFSET 后
- DML TOP 带圆括号，不提供 DML WITH TIES 或直接 ORDER BY
- OUTPUT 保留 INSERTED / DELETED 的上下文差异，支持 OUTPUT INTO 后再 OUTPUT
- 定义通常省略末尾分号，由生成器添加；WITH CTE 前的上一语句必须终止。GO 是客户端批处理分隔符，不是 T-SQL 语句，不写入定义
- 标识符引用、表达式合法性、权限、对象状态、参数绑定和批次限制由消费方/数据库校验

## 维护与验证

本仓库为定义集合，没有运行时数据库依赖或自动 CI。遵循同级仓库约定，不自动跑测试/类型检查。用户可按照 [validation](docs/validation.md) 使用指定 parser 构建产物做结构检查，再按需在隔离数据库验证示例。

当前已做官方语法对照和人工审阅；**未运行 parser、SQL Server 或 Studio 测试**。后续贡献必须明确报告实际验证层次。不要把 parser 通过等同于 T-SQL 正确。
