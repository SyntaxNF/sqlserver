# SQL Server SNF

本仓库维护 SQL Server 2025（17.x）Transact-SQL 的 SNF（Syntax Normal Form）定义，供阅读与 SQL 生成使用。

## 版本与目录

以 SQL Server 2025 GA Database Engine、兼容级别 170 为基线。每个 `.snf` 首行链接对应的 [Microsoft Learn 官方文档](https://learn.microsoft.com/en-us/sql/t-sql/language-reference?view=sql-server-ver17)。共享文档中的 Azure SQL、Synapse、Fabric 专属语法和预览特性不属于此基线。

- `query/`：查询与 DML。
- `create/`、`alter/`、`drop/`：数据库对象的创建、修改与删除。
- `transaction/`：事务控制。
- `other/`：控制流、游标、会话、权限及管理维护语句。
- `scripts/`、`tests/`：手动使用的结构检查与回归工具。

## SNF 用法

选取语句文件和所需 `CASE`，展开本地节点，再提供标识符、表达式、类型或语句体等输入。嵌套查询可以复用已有 statement 定义。

- `KEYWORD` 原样生成；`placeholder` 表示输入或可展开节点。
- `[ syntax ]` 表示整段可选；`{ a | b }` 为必选分支，`[ a | b ]` 为可选分支。
- `item [...]` 和 `item [, ...]` 重复完整的前一个 `item`，次数为零或更多，后者以逗号分隔；前项不是额外必选首项。
- 圆括号为 SQL 字面符号；SNF 保留符号用反斜杠转义。
- `CASE` 区分顶层变体；`WHERE` 定义复用节点；`ONEOFIS` 每物理行一个候选；`PARTOFIS` 每个空行分隔的 block 为一个候选；`STATEMENT` 声明嵌套语句类别。这些指令由消费方解释。

## 输入与生成约定

- `name` 是主对象，`new_name` 是其重命名目标；`table`、`schema`、`colname`、`constraint` 等表示其他对象角色。
- `data_type` 可输入完整类型声明；`*_expression`、`query_statement`、`statement_block` 等可输入完整表达式、查询或语句体，也可复用语法节点。相同占位符拼写本身不表示跨文件导入。
- 语句体保留内部必要的分号；嵌套查询通常不带尾部终止符。MERGE 必需的分号已写入定义，普通语句的终止由运行方处理；`GO` 是客户端批次分隔符。
- `cursor_variable` 输入包含前导 `@`。标识符及字符串按语法位置引用/转义，模板已有引号时只传入其中的内容。
- 多字段重复项通过完整 helper 或分组绑定；纯循环不套额外可选外壳，含关键字或括号的整体可选段仍需保留。
- 生成器按约定清理 SQL 圆括号内最后一个逗号；该清理应保留调用方提供的自由输入文本。
- 引号中的固定值、MERGE `$action` 和 RESTORE `lsn:` 保持原样，见 [固定文本配置](scripts/snf-fixed-literals.json)。配置中未覆盖的 `lsn_number` 等部分仍是输入。
- 权限、输入参数化、选项组合、对象状态和执行流程由消费方处理。

## 手动检查命令

按 `AGENTS.md`，仅在用户明确要求时运行。准备 [SyntaxNF/parser](https://github.com/SyntaxNF/parser) 的 `bcf2c3ac58b45e7d5391716393586b00b11e0c1a` checkout，并按其锁文件安装依赖（`tsx` 4.23.5），然后设置源码目录：

```sh
export SNF_PARSER_ROOT=/absolute/path/to/parser
npm run validate:snf
npm run validate:conventions
npm run validate:generator
npm run test:validation
npm run test:generator
```
