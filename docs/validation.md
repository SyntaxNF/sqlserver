# 生成模板验证与复现

本轮检查获得用户授权；不改变 AGENTS.md 的后续默认规则。检查仅覆盖 SNF 文档、真实 parser AST 和小型生成契约 fixture，不是 SQL Server SQL 语义校验、实库执行或实际下游生成器端到端测试。

## 固定实际 parser

- 仓库：[SyntaxNF/parser](https://github.com/SyntaxNF/parser)
- 提交：`bcf2c3ac58b45e7d5391716393586b00b11e0c1a`
- `snf-parser`：0.1.0；运行时工具 `tsx`：4.23.5
- `scripts/parser-runtime.mjs` 检查 checkout revision、src/依赖清单的工作区状态，把磁盘源文件逐个对照 Git blob，直接加载 `src/index.ts`；不信任已有 dist bundle
- 不新增仓库运行时依赖，不自动安装工具，不生成 `.snf.json`

## 用户主动运行

先取得上述固定 parser checkout，按其锁定依赖准备好运行时工具。在本仓库执行：

```sh
export SNF_PARSER_ROOT=/absolute/path/to/parser
npm run validate:snf
npm run validate:conventions -- docs/validation-audit.json
npm run validate:generator
npm run test:validation
npm run test:generator
git diff --check
```

parser 自身基础测试：

```sh
cd /absolute/path/to/parser
node --import tsx test/index.ts
```

`validate:generator` 和 `test:generator` 还支持 `SNF_ROOT=/absolute/path/to/another/sqlserver-tree`，用于保持当前校验器/fixture 不变地比较旧定义树。原有 `SNF_PARSER_MODULE` 路径替换为 `SNF_PARSER_ROOT`，以保证实际执行的是已核验的源码。

## 各层检查

- `validate:snf`：官方 `SNFDocumentParser.parse` 全量解析 302 个定义
- `validate:conventions`：来源、文件名/空白、指令、入口/辅助节点可达性、固定 literal、inventory 文件映射。`inputs` 是允许的输入候选，不是未解析引用错误
- `validate:generator`：文档/物理行往返、raw/span、一行一项的 ONEOFIS、`exchangeLoopNode` 完整绑定，识别游离 LOOP 和冗余纯 OPTIONAL→LOOP 外壳
- `test:validation`：22 个现有约定校验器正反例
- `test:generator`：302 个逐文件结构检查，加 62 个生成/契约测试，包括 0/1/2 次完整重复、SELECT/INSERT/SERVER AUDIT 分支、DML 子句顺序、ONLINE 和自由输入保留

`CASE`/`WHERE`/`PARTOFIS`/`ONEOFIS`/`STATEMENT` 都是消费方约定。parser 不自动绑定跨 block、跨文件或 SQL 类型；fixture 只实现这些测试需要的本地选择，不冒充产品消费方。

## LOOP 与 fixture 边界

LOOP 包含其前面的成员，次数为 0 或更多。前项不是额外必选首项；纯可选 LOOP 包装冗余。含关键字、括号、逗号的完整可选段仍可保留。完整成员的绑定需要 helper 或可重复 AST 分组，不能只重复赋值右值、闭括号或尾部引号。

`scripts/generator-fixture.mjs` 是小型 smoke renderer：按测试选择 OPTIONAL/ENUM、绑定局部 helper、控制 LOOP 次数和处理生成模板空白/括号尾逗号。自由输入先以占位标记保护，在清理后原样恢复，因此带换行注释、方括号内部空格和已转义引号的测试输入保持原样。期望文本是独立常量/输入计算，不用待测渲染结果构造自身期望。

这不是完整 SQL lexer、引用绑定器、安全执行器或实际下游生成器。任意变量值、范围、对象状态、语义组合、递归展开和任意 SQL 文本不在验证承诺中。0 次列表和可选组合的 fixture 结果仅证明模板约定，不表示对应 SQL 必然可在数据库执行。

## 固定文本与输入

[snf-fixed-literals.json](snf-fixed-literals.json) 的 9 文件/17 项/19 处固定文本契约保持不变。审计以原始 span 排除其中的 VARIABLE；失效清单项会报错。当前 [validation-audit.json](validation-audit.json) 包含 1339 个文件-输入名对、426 个不同输入名。它们可按 [placeholders.md](placeholders.md) 使用；不要求新增完整表达式/语句体语义校验器。

当前结果和对照见 [validation-report.md](validation-report.md)。没有新增自动 CI，没有启动数据库容器、连接数据库或安装 Studio。
