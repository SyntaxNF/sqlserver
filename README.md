# SQL Server SNF

本仓库维护 SQL Server 2025（17.x）Transact-SQL 的 SNF（Syntax Normal Form）模板，用于阅读 SQL 语法，并为语法编辑器和 SQL 生成器提供结构化输入。

## 版本基线

以 SQL Server 2025 GA Database Engine、兼容级别 170 为基线。每个 `.snf` 文件首行链接到对应的 [Microsoft Learn 官方文档](https://learn.microsoft.com/en-us/sql/t-sql/language-reference?view=sql-server-ver17)。共享文档中的 Azure SQL、Synapse、Fabric 专属语法和预览特性不属于此基线。

覆盖范围以仓库中的模板为准，文件存在不代表已覆盖对应语句的全部语法。

## 目录

- `create/`、`alter/`、`drop/`：数据库对象的创建、修改与删除。
- `query/`：查询与 DML。
- `transaction/`：事务控制。
- `other/`：控制流、游标、会话、权限及管理维护语句。
- `scripts/`：结构检查与回归工具。
- `tests/`：方言回归用例。

## 使用

使用 [snf-parser](https://github.com/SyntaxNF/parser) 读取 `.snf` 文件，选择顶层入口，再由消费方提供标识符、表达式、类型和语句体等输入。SNF 记号、定义指令与 AST 接口统一见 [parser 使用说明](https://github.com/SyntaxNF/parser#使用)和 [SNF 参考](https://github.com/SyntaxNF/parser/blob/main/docs/snf-reference.md)。

模板按 SQL 语句组织，同一语句的变体使用 `CASE`。应用中的操作映射、默认值、分支限制、标识符引用、输入参数化、权限与执行流程由消费方负责；创建与替换操作复用创建模板。

生成器应遵循 [parser 的生成约定](https://github.com/SyntaxNF/parser/blob/main/docs/snf-reference.md#生成时的分组间隔)，并清理模板结构产生的 SQL 圆括号内尾逗号，保留调用方提供的输入文本。

## 方言输入约定

- `data_type`、`*_expression`、`query_statement`、`statement_block` 等输入可包含完整类型、表达式、查询或语句体。
- 语句体保留内部必要的分号；嵌套查询通常不带尾部终止符。MERGE 必需的分号已写入模板，普通语句的终止由消费方处理；`GO` 是客户端批次分隔符。
- `cursor_variable` 输入包含前导 `@`。模板已有引号时，只传入正确转义的内部内容。
- 固定文本（含引号内固定值）保留模板中的大写拼写；外部系统所需的大小写由消费方处理。

## 维护与检查

维护时先阅读 [AGENTS.md](AGENTS.md)。检查命令按需手动运行；它们验证 SNF 结构与测试辅助生成行为，不执行数据库 SQL。

使用 Node.js 22，先安装并构建 parser，再显式指定本地构建。本仓库无需安装依赖：

```sh
(cd /absolute/path/to/parser && pnpm install --frozen-lockfile && pnpm build)
export SNF_PARSER_WORKTREE_MODULE=/absolute/path/to/parser/dist/esm/index.mjs
npm run validate
npm test
```

`npm run validate` 执行结构检查，`npm test` 执行回归检查；`validate:snf` 和 `test:regression` 是对应入口。脚本必须通过 `SNF_PARSER_WORKTREE_MODULE` 加载 parser，修改 parser 后需重新构建。

SQL Server 的 `validate` 还包含指令、固定文本约定与生成结构检查。

定义使用小写、连字符文件名，首行保留官方来源链接。公共检查契约变更需同步四个模板仓库；生成的 `*.snf.json` 不手工修改或提交。

## 许可证

[MIT](LICENSE)，Copyright (C) 2020-present, baskwind。
