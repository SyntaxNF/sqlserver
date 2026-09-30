# 验证说明

## 当前状态

初始提交仅完成官方来源对照与人工结构审阅。未运行 SNF parser、未执行 SQL Server、未验证 Studio 集成。此处是可维护的主动验证流程，不是成功测试报告。

遵循同级仓库约定：agents 不自动运行测试、类型检查或 parser 结构验证。用户决定何时运行。

## 轻量检查

在已初始化的 Git 工作区执行 git diff --check 可查空白问题；用 git diff 和编辑器逐文件检查官方语法与 CASE 分支。空白检查不验证语法。

## 用户主动执行 SNF 结构检查

该脚本使用官方 SyntaxNF/parser 的 SNFDocumentParser，不自行重造 SNF parser，不会执行 SQL。

参考源：SyntaxNF/parser commit bcf2c3ac58b45e7d5391716393586b00b11e0c1a，package.json 声明 0.1.0。这里没有假设该版本已发布到 npm。

1. 在单独目录准备并按其 README 构建受信任的 SyntaxNF/parser 源码（pnpm install，pnpm build）
2. 在本仓库设置构建产物绝对路径，然后主动运行：

```sh
SNF_PARSER_MODULE=/absolute/path/to/parser/dist/esm/index.mjs npm run validate:snf
```

脚本只读取六个 statement-family 目录的 .snf，逐一调用 SNFDocumentParser.parse。它验证块、括号、转义与重复记号等 parser 结构，**不解释 CASE/WHERE/STATEMENT 或解析跨文件引用**。若指定模块不导出 SNFDocumentParser，将明确失败。没有隐藏的 npm 安装、联网下载或自动数据库连接。

## 集成和 SQL 层下一步

- 消费方编写指令解析/绑定器，验证 CASE 唯一性、辅助节点解析、循环/引用作用域，给自由输入节点建立明确接口
- 生成正例：普通 SELECT、TOP PERCENT、TOP WITH TIES + ORDER、OFFSET 0/FETCH NEXT、CTE；INSERT 多行/DEFAULT/SELECT；三个 DML 的 OUTPUT 与 OUTPUT INTO 后第二 OUTPUT；基础 DDL/事务
- 生成负例：FETCH 无 OFFSET，OFFSET 无 ORDER，TOP 同层 OFFSET，DML TOP 无圆括号或 WITH TIES，INSERT DELETED、DELETE INSERTED、$action 出现在非 MERGE、Fabric QUALIFY/ORDER BY ALL
- 使用隔离的 SQL Server 2025 测试数据库，记录 engine build、edition、platform、compatibility level、会话选项和各例实际结果；不要对用户生产库执行 DDL/DML
- 加入约束反例：非法数据类型/范围、重复选项、OUTPUT 聚合/子查询、过滤索引非法谓词、视图批次限制
- 只有完成相应层次验证后，才在覆盖表写明通过项。示例语法通过不保证所有合法分支都被覆盖

不自动添加 CI，不借此启动数据库容器，不自动安装依赖。
