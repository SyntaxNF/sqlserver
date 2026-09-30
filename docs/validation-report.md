# SNF validation report — 2026-09-30

User-triggered validation of SQL Server inventory baseline `1c0b74da2a733d0ad1e5366462e0ff4f25efae3f`, branch `expand-sqlserver-2025-inventory`. The 302 SNF sources were unchanged by this validation: no parser syntax repairs were necessary. This change adds consumer literal contracts, reproducible checks, regression tests and the evidence below.

## Results

| Check | Result |
| --- | --- |
| Official pinned parser build (`npm run build`) | Passed; Vite 8.2.0, 15 modules transformed, declaration generation completed |
| `npm run validate:snf` | Passed: 302/302 documents |
| `npm run validate:conventions` | Passed: 302 documents, 1004 nonempty content blocks, 0 errors |
| `npm run test:validation` | Passed: 22 tests, 0 failures, 0 skipped |
| `git diff --check` | Passed |
| Official parser `npm test` | Blocked before tests: tsx IPC listener `EPERM` at `/tmp/tsx-1000/17.pipe`; not a test pass |
| SQL Server / Studio / generated SQL / full consumer binder | Not run / not implemented |

Directives: 466 CASE, 162 WHERE, 173 ONEOFIS, 33 PARTOFIS, 13 STATEMENT. All 381 local auxiliary definitions are reachable from a statement entry. 77 documents use an implicit single-form root; these are valid. SELECT `from_expression` recursion is recorded, not expanded indefinitely. 80 unannotated alternative blocks belong to PARTOFIS.

The complete reproducible [audit JSON](validation-audit.json) includes every file's local references, input candidates and recursive definitions. Open inputs: 1334 file/name pairs, 427 distinct names. These are not automatically errors or proof of input-domain validation.

## Defect addressed: fixed text incorrectly looks like input

The parser deliberately classifies lowercase substrings as VARIABLE, including inside quotes and adjacent to punctuation. A consumer collecting VARIABLE nodes blindly would turn fixed provider/codec names, `'node()'`, `'current database'`, BULK format choices, `$action`, and the `'lsn:` prefix into editable inputs. [snf-fixed-literals.json](snf-fixed-literals.json) now records 17 exact snippets across 9 files (19 occurrences). Source casing is preserved. The audit excludes only VARIABLE spans entirely inside these snippets and fails stale entries. RESTORE `lsn_number` remains an input. This is a consumer contract, not a modification to parser tokenization or a shipped Studio fix.

Source references are the first-line official URLs in those nine files. In particular, [CREATE EVENT NOTIFICATION](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-event-notification-transact-sql?view=sql-server-ver17#arguments) identifies `current database` as a case-insensitive literal; [RESTORE](https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17#syntax) specifies the fixed `lsn:` prefix.

## Environment and exact successful commands

- Node v24.19.0; npm 11.9.0; pnpm 11.19.0
- Parser 0.1.0 source revision `bcf2c3ac58b45e7d5391716393586b00b11e0c1a`; official lockfile retained; no tracked parser source changes
- Built entry SHA-256: `5aa14167ad371522ed5815719f74639aa1526ff71ed1dfd8ec0a00975f74e510`

```sh
# /workspace/shared/snf-parser
npm run build
# /workspace/shared/sqlserver-validation-git
export SNF_PARSER_MODULE=/workspace/shared/snf-parser/dist/esm/index.mjs
npm run validate:snf
npm run validate:conventions -- docs/validation-audit.json
npm run test:validation
git diff --check
```

Dependency preparation: plain `pnpm install --frozen-lockfile` failed because its default data directory was absent/unwritable. The bounded workspace-local attempt was:

```sh
XDG_DATA_HOME=/workspace/shared/pnpm-data XDG_CACHE_HOME=/workspace/shared/pnpm-cache pnpm install --frozen-lockfile --store-dir /workspace/shared/pnpm-store
```

It downloaded/linked all 114 packages and passed its lockfile supply-chain checks but returned `ERR_PNPM_IGNORED_BUILDS` for esbuild's lifecycle script. No lifecycle approval or security setting was changed. Plain `pnpm build` also failed on its automatic install/default data-directory step. `npm run build` then invoked the repository's unchanged Vite build script successfully with the installed dependencies. These failed preparation attempts are not counted as passes. Upstream parser tests were attempted separately and blocked by the IPC restriction above; the SQL Server repository's 22 regression tests use Node's test runner and all ran successfully.

## Scope of this pass

No malformed parser syntax, duplicate directives, empty owned blocks, unreachable local definitions or invalid continuation ownership were found. Source spelling and grammar coverage were left intact. The conventions checker is a diagnostic layer over the official AST, not a replacement parser or complete reference binder. It cannot distinguish every undeclared typo from an intended typed/opaque input. File inventory mapping and known literal handling are checked; full source-catalog semantic reconciliation, SQL engine behavior, quote/parenthesis SQL validity and Studio integration are not established by this report. The 76 partial inventory entries remain partial.
