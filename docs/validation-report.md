# SQL Server generator review — 2026-10-01

User-authorized generator-focused revision of the existing SQL Server 2025 GA inventory. All **302 SNF files, 377 inventory rows and 76 partial rows** remain. This is a narrow revision of 29 SNF files, not a rollback to the original 29-file inventory. The separately requested display line breaks remain; unrelated definitions were not reformatted.

## Results

| Check | Result |
| --- | --- |
| Verified pinned parser source | 302/302 documents passed |
| Repository conventions | 1016 nonempty content blocks, 0 errors |
| Generator AST audit | 1318 total physical blocks, 458 CASE, 397 helpers, 37957 raw AST nodes, 488 bound LOOPs, 0 errors |
| Parser/generator-contract tests | 364 passed: 302 per-file checks plus 62 contract/fixture tests |
| Convention-regression tests | 22 passed, 0 failed/skipped |
| Parser's own base tests via `node --import tsx test/index.ts` | Passed |
| `git diff --check` | Passed |
| SQL Server / Studio / actual downstream generator end-to-end | Not run |

The current [audit JSON](validation-audit.json) records local references, recursion and 1339 file/input-name pairs (426 distinct names). Open expression/body/query inputs are intentional; these counts are not unresolved-reference failures or input-domain proofs. All 397 helper declarations are reachable. No automatic CI was added.

## Changes and evidence

- SELECT shares one query specification and tail instead of four near-identical SELECT/TOP/TOP_WITH_TIES/OFFSET_FETCH statements. SET_OPERATION reuses the same ORDER BY/OFFSET/FETCH tail. The template does not implement a TOP/WITH TIES/OFFSET semantic compatibility matrix
- INSERT shares its common prefix and keeps source-position differences in source alternatives. SERVER AUDIT shares its shell while preserving FILE, APPLICATION_LOG and SECURITY_LOG destinations
- Removed 40 optional wrappers that contained only a zero-or-more LOOP. Keyword/bracket-bearing optional clauses remain intact
- Fixed 7 detached postfix markers: complete snapshot files, listener IP tuples, quoted routing targets, JSON paths and USE HINT members. Event/target settings now repeat complete left-name/equals/right-value assignments rather than only the right value
- Added documented UPDATE/DELETE CURRENT OF and OPTION clauses, and ALTER COLUMN WITH (ONLINE = ON/OFF). No generic cloud-only INSERT OPTION tail or ALTER COLUMN WAIT_AT_LOW_PRIORITY was added
- Clarified that free expressions, bodies and reusable queries are normal generation inputs; semantic/context notes are reference information rather than a requirement to recreate a SQL validator

Official scope/order references: [SELECT](https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver17), [INSERT](https://learn.microsoft.com/en-us/sql/t-sql/statements/insert-transact-sql?view=sql-server-ver17), [SERVER AUDIT](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-server-audit-transact-sql?view=sql-server-ver17), [CREATE DATABASE](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-transact-sql?view=sql-server-ver17), [availability-group listeners](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-availability-group-transact-sql?view=sql-server-ver17), [CREATE EVENT SESSION](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-event-session-transact-sql?view=sql-server-ver17), [ALTER EVENT SESSION](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-event-session-transact-sql?view=sql-server-ver17), [UPDATE](https://learn.microsoft.com/en-us/sql/t-sql/queries/update-transact-sql?view=sql-server-ver17), [DELETE](https://learn.microsoft.com/en-us/sql/t-sql/statements/delete-transact-sql?view=sql-server-ver17), [online ALTER COLUMN](https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-table-transact-sql?view=sql-server-ver17#b-online-alter-column). Other file-first source links and the bounded 2026-09-30 source catalogue remain in place.

## Regression comparison

The same structural checker against the immutable prior main `4a5a4a51e652ecda79c509653596eb3f129fa45b` found **7 detached LOOP markers and 40 redundant pure optional-loop wrappers**. The selected 33 whole-member regressions (11 cases × 0/1/2 iterations) all failed against that old tree because the complete repeated helpers were absent, and all pass on the current definitions. Separate fixtures exercise free bodies, quoted values, INSERT source choices, SELECT pagination and DML order.

The first fixture run exposed expectation/setup mistakes (comma spacing, PROC selection and body placeholder name); they were corrected rather than changing grammar to satisfy incorrect assertions. Independent static review found no remaining grammar blocker. Its fixture comments led to explicit FROM coverage and opaque-input protection plus a regression for SQL line comments and bracketed identifiers.

## Reproduction and limits

Commands are in [validation.md](validation.md). Runtime: Node v24.19.0; actual `SyntaxNF/parser` source revision `bcf2c3ac58b45e7d5391716393586b00b11e0c1a`; `tsx` 4.23.5. Source/dependency manifests are checked against the pinned checkout and source files against Git blobs. No parser source was modified and no new install/build was required for this review.

The fixture is deliberately small and is not the actual downstream SQL generator. It demonstrates only the explicit AST choices, zero-or-more repetition, complete-member output and opaque inputs covered by the tests. No SQL Server build, edition, OS, object state, permissions, live compilation/execution, full quote/identifier grammar or Studio integration was verified. No CI pass is implied when a repository has no configured checks. The historical 2026-09-30 parser/conventions report remains available in Git history.
