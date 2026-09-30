# 验证说明

## 当前状态（2026-09-30，用户主动触发）

已对 302 个文件运行固定版本官方 SNF parser，全部通过；新增仓库约定检查和 22 个校验器正反例测试也全部通过。结果、环境、失败过的准备步骤和边界见 [validation-report.md](validation-report.md)，逐文件结果见 [validation-audit.json](validation-audit.json)。

**没有执行 SQL Server、没有验证 Studio 集成；76 个 partial 条目没有因此变成完整语法。** 本检查不提供 SQL 语义、实际 SQL 生成、输入合法性或消费方运行时绑定证明。

遵循仓库约定：agents 不自动运行测试、类型检查或 parser 结构验证。用户决定何时运行；本次由用户明确要求启动。没有新增自动 CI。

## 准备固定 parser

使用官方 [SyntaxNF/parser](https://github.com/SyntaxNF/parser) commit `bcf2c3ac58b45e7d5391716393586b00b11e0c1a`，package.json 版本 `0.1.0`。不假设该版本已发布到 npm。在单独目录取得该 revision、按其 README 安装依赖并构建：

```sh
git clone https://github.com/SyntaxNF/parser.git /absolute/path/to/parser
cd /absolute/path/to/parser
git checkout bcf2c3ac58b45e7d5391716393586b00b11e0c1a
pnpm install --frozen-lockfile
pnpm build
```

本轮 pnpm 11 的工作目录和依赖生命周期行为需要调整执行方式，精确记录见报告；不修改官方 parser 源码。

## 用户主动执行的命令

在本仓库执行，设置构建产物绝对路径：

```sh
export SNF_PARSER_MODULE=/absolute/path/to/parser/dist/esm/index.mjs
npm run validate:snf
npm run validate:conventions
npm run test:validation
# 可选：生成逐文件、确定顺序的 JSON 审计结果
npm run validate:conventions -- docs/validation-audit.json
git diff --check
```

- `validate:snf`：官方 `SNFDocumentParser.parse` 扫描六个 family 的所有 .snf；检查 SNF 方/花括号、转义、重复记号等 parser 语法。圆括号和引号是叶子符号，**parser 不证明它们具有合法 SQL 配对/语义**
- `validate:conventions`：复用同一个官方 parser AST，检查版本来源、文件名、空白、指令形状/大小写/唯一性、非空内容块、入口、辅助节点可达性、重复结构、空候选、inventory 文件映射和固定 literal 清单；不会执行 SQL
- `test:validation`：使用真实 parser 的 22 个校验器正反例回归测试；不是 SQL Server 测试套件

单一语句形态允许首个无注释内容块作为隐式入口，不强制 CASE。CASE/WHERE/STATEMENT 各自只拥有自己的物理内容块；PARTOFIS/ONEOFIS 可以拥有紧随的未注释候选块。本地辅助节点按文件作用域收集并检查从入口可达；递归如 SELECT 的 from_expression 明确记录，不无限展开。STATEMENT 只声明类别，消费方仍须绑定。

## 引用与 literal 边界

[snf-fixed-literals.json](snf-fixed-literals.json) 列出 parser 会分出小写 VARIABLE、但官方语法实际规定为固定文本的精确片段（9 文件、17 项、19 处）。校验器按源码 span 排除这些变量；失效清单项会失败。包括 provider/codec 字符串、'node()'、'current database'、BULK DATAFILETYPE、MERGE `$action` 和 RESTORE `'lsn:` 前缀；`lsn_number` 仍是输入。消费方必须应用同等 literal 语义，不能直接把所有 VARIABLE 当输入框。

审计 JSON 的 `localReferences` 只表示文件内已声明且可达的节点；`inputs` 是排除本地节点/已知 literal 后的输入候选，按文件去重。当前 1334 个文件-名称对、427 个不同名称。它们包括 [placeholders.md](placeholders.md) 及分类契约中的标识符、值、表达式和 opaque grammar，**不是 1334 个缺失引用错误，也不是全部输入已经逐个验证**。检查器不能从未声明名称本身区分拼写错误和有意 opaque 输入；新增/变化的输入仍需人工契约审查。跨文件导入、实际绑定、参数域和语义约束尚未实现。

## SQL 与集成层下一步

- 消费方实现 literal、指令、引用、递归/作用域与输入契约，再验证实际生成
- 生成正例：普通 SELECT、TOP PERCENT、TOP WITH TIES + ORDER、OFFSET/FETCH、CTE；INSERT VALUES/DEFAULT/SELECT；DML OUTPUT/OUTPUT INTO；DDL/事务
- 生成负例：FETCH 无 OFFSET、OFFSET 无 ORDER、TOP 同层 OFFSET、DML TOP 无圆括号或 WITH TIES、INSERT DELETED、DELETE INSERTED、非 MERGE $action、Fabric QUALIFY/ORDER BY ALL
- 在明确授权的隔离 SQL Server 2025 测试库记录 engine build、edition、platform、compatibility、会话选项与实际结果；不对生产库执行 DDL/DML
- 验证值域、重复选项、OUTPUT/过滤索引限制、模块与 VIEW batch 上下文，以及 coverage 中已记录的官方文档分歧

不自动添加 CI、不启动数据库容器、不连接数据库、不安装 Studio。只有真实完成某一层验证后，才能声明该层通过。
