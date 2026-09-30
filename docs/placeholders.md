# 占位符与消费方契约

SNF 是生成结构，不是安全边界。当前未定义的节点不是“支持所有语法”的通配承诺。消费方必须识别它们、校验范围后填入；不能把原始用户文本直接拼接成可执行 SQL。

## 自由输入类别

- 标识符：name、table、new_table、schema、database、owner、cte、colname、referenced_table、referenced_colname、constraint、default_constraint、filegroup、base_object、collation 与各 *_alias。由对应语句约束限定一到多部件，逐部件引用为合法 T-SQL 标识符；name 不是固定支持四部件名。table 在 SELECT 可指表/视图/CTE，DML 目标则需可更新性与作用域校验
- update_target / delete_target：合法表/视图/表变量或 FROM 中绑定的表别名，不能填入任意 JOIN 文本。output_target 为 OUTPUT INTO 允许的本地表/表变量；须满足 OUTPUT 的目标表限制
- data_type：完整类型声明（如 int、nvarchar(100)、decimal(18,2)），尚未结构化所有 2025 类型。CREATE SEQUENCE 只允许受支持的整数类型及 scale=0 的 decimal/numeric；不能无条件复用一般类型候选
- value_expression、boolean_expression、default_expression、computed_expression：上下文合法表达式；没有独立表达式 parser。分组、聚合、窗口、子查询、函数适用性仍需判定
- row_count_expression：TOP 合法数值表达式；offset_expression 非负，fetch_expression 至少 1；禁止对应位置不允许的相关子查询。PERCENT 的数值范围及转换按官方规则处理
- output_expression：严格受 OUTPUT 限制的标量表达式，无聚合/子查询；修改表的列必须用 INSERTED/DELETED。UPDATE/DELETE 中其他 FROM 表的引用可通过此节点输入，但须正确绑定。INSERT 不得引用 DELETED，DELETE 不得引用 INSERTED，只有 query/merge.snf 允许 $action，其他 DML 不允许
- filter_expression：CREATE INDEX 受限过滤谓词，不是任意 boolean_expression；函数、子查询、OR/复杂表达式等按官方过滤索引限制处理
- from_expression：SELECT 中已有本地结构化定义；UPDATE/DELETE 中暂为完整合法 FROM 成员自由输入，可按 SELECT 定义绑定复用，但 parser 不自动跨文件解析。允许 JOIN 来源不代表支持任意递归组合
- query_statement：STATEMENT SELECT 是消费方的查询类型声明，不是只有 SELECT 一个关键字，也不是跨文件 import。消费方应绑定到查询定义或受校验的完整查询；嵌套时禁止语句终止符，并限制 INTO、ORDER BY、CTE 等合法性。CREATE VIEW 禁止 INTO/OPTION/临时对象等
- *_value：语法位置允许的常量（有些可为有符号整数），不是任意表达式。IDENTITY 种子/步长、sequence 界限/缓存及 FILLFACTOR/MAXDOP 等各有数值范围
- transaction、savepoint、rollback_target：事务/保存点名称或文档允许的局部变量；ROLLBACK 的目标不是 TO 子句。description 是去掉引号后的字符串内容，由生成器把单引号加倍，不允许替换语句片段

## 列表、组合与上下文

- 表/视图列数、VALUES 元组宽度、目标列数应匹配；直接 INSERT VALUES 上限 1000 行
- 列约束不能任意重复相互冲突的 PK/DEFAULT/IDENTITY；computed、IDENTITY、DEFAULT、类型和可空性组合须校验。CREATE TABLE 列约束重复没有额外逗号，表元素间有逗号
- WITH 选项、view_attribute 列表不能重复冲突；IGNORE_DUP_KEY=ON 不适用于 filtered index
- 输出行可能来自最终回滚的 DML，且无稳定顺序；不能以 OUTPUT 的存在推断事务成功
- 带 OUTPUT 的目标不能是远程表；无 INTO 的 OUTPUT 有 enabled trigger 限制；OUTPUT INTO 目标也有 trigger、constraint 等限制
- CREATE VIEW 的 WITH CHECK OPTION 不得与查询中的 OFFSET/FETCH 组合；索引视图也不允许 OFFSET/FETCH。此限制须在展开 query_statement 后检查
- 与 TOP/OFFSET 不兼容的查询作用域不能被自由输入绕开；WITH TIES 的 ORDER BY 定义同值边界，不保证确定行数
- 所有 *_statement 的语句边界、CTE 前一语句终止和 CREATE VIEW 首条 batch 限制由 runner 负责。分号一般由 runner 添加，不能在嵌套子查询尾添加
- 本项目目前不提供 SQL 参数化、执行器或权限系统；SNF 转 AST 成功不等于 SQL 安全或有效

## 扩展契约

- [关系查询、索引、外部对象](relational-placeholders.md)
- [编程、游标、会话](programming-placeholders.md)
- [权限、安全、密钥](security-placeholders.md)
- [管理、DBCC、Service Broker](operations-placeholders.md)

上面的初始节点说明与这些逐类契约一起使用；同名节点在不同文件中不自动绑定。新增定义的结构/缺口以 inventory 与覆盖表为准。完整约束以文件首行 Microsoft 文档为准。
