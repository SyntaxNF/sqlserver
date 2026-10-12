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

解析语句文件并选取所需 `CASE`，再提供标识符、表达式、类型或语句体等输入。嵌套查询可以复用已有 statement 定义。

- `KEYWORD` 原样生成；`placeholder` 表示输入或可展开节点。
- `[ syntax ]` 表示整段可选；`{ a | b }` 为必选枚举，`[ { a | b } ]` 为可选枚举。`[ a | b ]` 不合法，未转义的 `|` 只能直接出现在 `{}` 内。
- `item [...]` 和 `item [, ...]` 重复完整的前一个 `item`，次数为零或更多，后者以逗号分隔；前项不是额外必选首项。
- 圆括号为 SQL 字面符号；SNF 保留符号用反斜杠转义。
- `CASE` 区分顶层变体；`WHERE` 定义复用节点；`ONEOFIS` 每物理行一个候选；`PARTOFIS` 每个空行分隔的 block 为一个候选；`STATEMENT` 声明嵌套语句类别。这些指令由 parser 编译为最终 AST；STATEMENT 仅保留标识与类别。

## 输入与生成约定

- `name` 是主对象，`new_name` 是其重命名目标；`table`、`schema`、`colname`、`constraint` 等表示其他对象角色。
- `data_type` 可输入完整类型声明；`*_expression`、`query_statement`、`statement_block` 等可输入完整表达式、查询或语句体，也可复用语法节点。相同占位符拼写本身不表示跨文件导入。
- 语句体保留内部必要的分号；嵌套查询通常不带尾部终止符。MERGE 必需的分号已写入定义，普通语句的终止由运行方处理；`GO` 是客户端批次分隔符。
- `cursor_variable` 输入包含前导 `@`。标识符及字符串按语法位置引用/转义，模板已有引号时只传入其中的内容。
- 多字段重复项通过完整 helper 或分组绑定；纯循环不套额外可选外壳，含关键字或括号的整体可选段仍需保留。
- 生成器按约定清理 SQL 圆括号内最后一个逗号；该清理应保留调用方提供的自由输入文本。
- 固定文本统一使用大写，包括引号内固定值、MERGE `$ACTION` 和 RESTORE `LSN:`；`lsn_number` 等实际输入保留小写。校验直接使用 AST 节点类型识别输入，无需固定文本例外配置。生成时保留模板中的大小写，不自动恢复外部系统的原始拼写。
- 权限、输入参数化、选项组合、对象状态和执行流程由消费方处理。

## 手动检查命令

按 `AGENTS.md`，仅在用户明确要求时运行。当前定义使用显式 OPTIONAL/ENUM 语法，先构建[SyntaxNF/parser](https://github.com/SyntaxNF/parser)，再显式选择工作区构建：

```sh
(cd /absolute/path/to/parser && pnpm build)
export SNF_PARSER_WORKTREE_MODULE=/absolute/path/to/parser/dist/esm/index.mjs
npm run validate
npm test
```

脚本只通过 `SNF_PARSER_WORKTREE_MODULE` 加载指定构建，标记为 `working-tree-build`；缺少该配置会直接报错。修改 parser 后应重新构建。

四库统一使用 `npm run validate` 执行全部结构检查、`npm test` 执行全部回归；`validate:snf` 为结构检查入口，`test:regression` 为回归入口。无需安装本库依赖，使用 Node.js 22 和上面明确指定的 parser 构建。

基础检查统一覆盖源文件与 AST 范围、显式 OPTIONAL/ENUM/GROUP、完整成员的 LOOP 绑定、冗余纯循环可选层、四空格缩进与末尾换行，对所有文件执行。生成回归覆盖 0/1/2 次循环、显式枚举、可选项、分隔符及自由输入原文保留。SQL Server 的 `validate` 还包含其指令/固定文本约定检查和生成结构检查；各库保留自己的方言回归。

`scripts/parser-runtime.mjs`、`scripts/snf-contract.mjs` 及其测试在四库保持一致；`generator-fixture.mjs` 仅本地文档加载入口不同，`generator-contract.test.mjs` 保持一致。修改公共契约时同步四库。报告的 `parserInput` 是实际加载路径；这些检查验证 SNF 和测试辅助生成行为，不执行数据库 SQL。


`SNFDocumentParser.parse()` 一次返回最终 AST：从 `document.entries` 获取入口，从 `document.definitions` 获取已编译定义；`blocks` 只保留源码。WHERE/ONEOFIS/PARTOFIS 引用已经展开，LOOP 直接包含完整成员和 `separator`，QUOTED 保留引号序列。递归引用的 `target` 已绑定到定义根 UID，STATEMENT 只保留名称与类别，不加载外部模板。

最终 AST 保留普通行内 BLANK（引号外归一为单空格），仅清理引号外 OPTIONAL / GROUP 首尾排版区域中不带 `indentLevel` 的 BLANK；换行、缩进锚点及引号内空白保留。生成器为实际输出内容的 OPTIONAL / GROUP 在左右提供空格，与已有水平空白合并，避免行首尾或换行旁多余空格；空分组、未选可选项和零次循环不产生间隔。其余节点按叶子 `content` 和保留的空白拼接，不推断标点连接；引号内不补分组间隔，自由输入文本原样保留。需要紧贴的前缀应纳入完整候选，如 `{ 'value' | N'value' }`、`@@GLOBAL.system_variable`，不要在前缀与正文之间设置 OPTIONAL / GROUP 边界。

所有最终节点自动带 `uid`，动态节点同时带 `name`；VARIABLE/REFERENCE/STATEMENT 取自身名称，OPTIONAL/ENUM/LOOP 使用大写功能名称，允许重名。消费方无需额外结构转换或 UID 分配。源节点通过 `sourceBlock` 和 `start/end` 指向定义或引用的实际来源。
