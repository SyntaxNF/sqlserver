# 占位符与生成输入

SNF 描述 SQL 生成结构，不负责成为 SQL 语义校验器。表达式、完整类型、语句体以及可复用查询都可以是自由输入；不要求为了生成 SQL 再实现一套完整 T-SQL parser、类型系统或上下文校验器。下面的类型和上下文说明用于帮助选择输入，不是每次展开模板前必须通过的检查清单。

## 输入与复用

- 标识符：name 是主对象；table、schema、database、colname、constraint、filegroup、owner 和各 *_alias 表示对应的对象角色。限定名和标识符引用方式按使用场景处理
- data_type：完整类型声明，例如 int、nvarchar(100)、decimal(18,2)。不必在 SNF 内复制类型/函数目录
- value_expression、boolean_expression、computed_expression、default_expression：可直接输入完整表达式。filter_expression、output_expression 仍保留名称所指的特定用途；模板不检查其内部语法或语义
- from_expression：SELECT 内为本地结构；UPDATE/DELETE 可输入完整 FROM 成员，或者由消费方复用查询构造器。相同拼写本身不是跨文件导入
- query_statement：STATEMENT SELECT 表示可复用查询的类型，也允许输入完整查询。query_specification 在 SELECT 文件中复用本地 SELECT 主体；query_operand 表达一个集合操作成员，query_tail 复用排序、分页和结果/提示尾部
- statement_block、sql_statement_list：自由输入完整语句或模块体，保留自身必要的语句分隔符。无需把整个过程语言重新拆成 SNF。嵌套查询通常不带尾部终止符，GO 是客户端 batch 分隔符
- *_value、row_count_expression、offset_expression、fetch_expression：对应位置的值或表达式输入。数值范围、对象存在性和类型匹配不由模板保证
- cursor_name 是游标标识符，cursor_variable 包含前导 @；UPDATE/DELETE 的 query_hint 可以输入完整提示成员或由消费方复用已有提示选择器，不需要复制 SELECT 的整个目录

## LOOP 与完整成员

- `item [, ...]` / `item [...]` 经 parser walker 绑定后，整个 item 成为 LOOP 的成员，次数为 **0 或更多**；前面的 item 不是独立必选的首项
- `[ item [, ...] ]` 这种只包着 LOOP 的可选外壳冗余，应直接使用 LOOP。`[ WITH ( item [, ...] ) ]`、`[ ( item [, ...] ) ]` 等包含关键字/字面括号的完整可选段仍有意义
- LOOP 绑定紧邻的 VARIABLE、ENUM 或 OPTIONAL，不能直接把尾部引号/圆括号当作完整成员。因此字符串列表、文件/IP 元组、赋值必须用完整 helper 或分组包住
- 本轮的 snapshot_file_definition、listener_ip_definition、routing_server、json_path_literal、hint_name_literal、event_attribute_assignment 和 target_parameter_assignment 都让一次循环拥有完整输出
- 空列表、互斥选项、模块上下文等是否适用于某次数据库操作，由调用者按需要决定；不通过复制整套语句分支强制非空或穷举组合

## SQL 上下文与执行边界

TOP/OFFSET、WITH TIES/ORDER BY、OUTPUT 上下文、VIEW 和函数限制、VALUES 列宽、MERGE 分支数量等是真实的数据库规则，但不是 SNF 模板的验证职责。SELECT 用同一主体和独立可选段表示这些能力；模板本身不保证任意选择组合都可执行。MERGE 的必需分号仍写在定义中，其他语句的 batch/终止策略由运行方处理。

自由输入和安全执行是不同层次：字符串内容仍需要适当引用/转义，实际执行应采用适当的参数化、权限和确认机制。本仓库没有数据库执行器，也不承诺任何自由输入可安全地直接执行。

## 固定文本

parser 的 VARIABLE 类型不等于输入契约。引号中的大小写混合固定值、MERGE `$action` 和 RESTORE `lsn:` 必须保留原样；精确 span 清单见 [snf-fixed-literals.json](snf-fixed-literals.json)。`lsn_number` 等未覆盖部分仍是输入。此次没有改变这些 literal 约定。

## 分类参考

[关系/索引/外部对象](relational-placeholders.md)、[编程/会话](programming-placeholders.md)、[安全](security-placeholders.md)、[管理/DBCC/Broker](operations-placeholders.md) 保留官方适用范围与已知限制供按需参考。它们不是要求生成器实现全部检查的产品规范。结构缺口和 76 个 partial 条目仍按 [coverage.md](coverage.md) 明示；每个定义首行链接到对应的 Microsoft 文档。
