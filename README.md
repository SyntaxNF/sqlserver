# SQL Server SNF

整理 SQL Server 2025（17.x）Transact-SQL 的 SNF（Syntax Normal Form）定义，供阅读与 SQL 生成使用。已从首批 29 个文件扩展到 **302 个定义文件**，按官方命令目录建立了可审计清单。**这仍不是完整 T-SQL 语法、SQL 校验器或已接入 Studio 的实现。**

## 版本与范围

- 核对日期：2026-09-30；SQL Server 2025（17.x）GA Database Engine，目标兼容级别170
- 面向独立 SQL Server，收录关系查询、对象 DDL、编程、权限安全、管理维护及 Service Broker；不同 edition、Windows/Linux、组件和 CU 的条件在覆盖表/输入契约中记录，不承诺跨平台功能完全一致
- 不把 Azure SQL、Synapse、Fabric 专属分支混入引擎语法；Azure Arc-enabled SQL Server、Azure/S3 备份和外部数据源则按实际引擎支持分别处理
- 当前官方说明确认 JSON/JSON INDEX 已 GA；CREATE VECTOR INDEX 等仍为 preview。本仓库不因主版本 GA 就自动纳入所有预览功能
- 主版本基线并非“全部 CU 和所有语义组合已验证”。具体版本、edition、compatibility 和组件条件仍由消费方核对

官方依据：[发布说明](https://learn.microsoft.com/en-us/sql/sql-server/sql-server-2025-release-notes?view=sql-server-ver17)、[新功能](https://learn.microsoft.com/en-us/sql/sql-server/what-s-new-in-sql-server-2025?view=sql-server-ver17)、[当前 JSON GA 状态](https://learn.microsoft.com/en-us/sql/relational-databases/json/json-data-sql-server?view=sql-server-ver17#sql-server-2025-changes)、[Build/CU](https://learn.microsoft.com/en-us/troubleshoot/sql/releases/sqlserver-2025/build-versions)。

## 覆盖与目录

- query/：SELECT、DML、MERGE、BULK INSERT、RECEIVE、旧式 text 操作
- create/、alter/、drop/：关系/图/外部对象、模块、类型、权限主体、加密、审计、数据库、HA、Broker、资源治理等
- transaction/：本地/分布式事务、提交、回滚、保存点、隔离级别
- other/：控制流、游标、执行、SET、权限、备份恢复、31个适用的独立 DBCC 命令及管理语句
- docs/：完整清单、来源页面映射、结构缺口、输入契约和验证说明
- scripts/：用户主动执行的 SNF parser 结构检查；不自动运行

[覆盖表](docs/coverage.md)列出 **377 个清单条目**：265 个已结构化语句形态、76 个部分定义、36 个不适用/排除条目。条目数不等于独立命令数，多个 SET 或变体可以共用文件。官方源页面逐项对应见 [source-catalog.json](docs/source-catalog.json)，机器可读定义清单见 [inventory.json](docs/inventory.json)。

仍有实际语法工作未完成：复杂查询/表达式、内存优化表/FileTable、完整选项与权限/事件目录、模块体、跨语句绑定和语义验证。文件存在不代表该命令所有合法写法已经覆盖；请看每行 partial 和输入契约。

## SNF 约定

沿用 [SyntaxNF/parser](https://github.com/SyntaxNF/parser)、[PostgreSQL](https://github.com/SyntaxNF/postgresql)、[MySQL](https://github.com/SyntaxNF/mysql)、[Oracle](https://github.com/SyntaxNF/oracle) 的目录、命名和定义方式：

- KEYWORD 是关键字；placeholder 是上下文受限输入或待展开节点
- `[ syntax ]` 可选；`{ a | b }` 必选分支；`[ a | b ]` 可选分支
- `item [, ...]` 逗号列表；`item [...]` 重复；圆括号是 SQL 字面符号；保留符号用反斜杠转义
- CASE 区分变体，WHERE/PARTOFIS/ONEOFIS 定义节点，STATEMENT 声明嵌套语句类别
- 指令是消费方约定，不是 parser 内建语义。消费方必须实现引用绑定、递归、作用域和 [自由输入契约](docs/placeholders.md)，不能直接输出未展开节点
- TOP 与 OFFSET/FETCH、DML OUTPUT 上下文等仍有约束；MERGE 必需分号已写入定义，普通语句由 runner 终止；GO 是客户端批次分隔符
- 权限、状态、输入转义、参数化、执行许可与产品安全策略由消费方负责，不通过删掉危险语法来伪装完整性

## 验证状态

2026-09-30 用户主动触发验证：固定版本官方 parser **302/302 通过**，仓库约定检查 **1004 内容块、0 错误**，校验器回归测试 **22/22 通过**。修补固定 literal 与输入变量的消费契约歧义。详见 [验证报告](docs/validation-report.md) 和 [复现命令](docs/validation.md)。**未执行 SQL Server/Studio，未验证完整消费方绑定或全部 SQL 语义；76 个 partial 条目保持不变。** 没有自动 CI。
