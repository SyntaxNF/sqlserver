# SQL Server SNF Guidelines

Target SQL Server 2025 (17.x) Database Engine, compatibility level 170, GA features only. Read README.md before changes. Do not import Azure SQL, Synapse, Fabric or preview grammar simply because it appears on a shared Microsoft Learn page.

- Organize definitions by SQL statement family; one lowercase hyphenated filename per statement, CASE for variants
- Start every .snf with its official, version-scoped Microsoft source URL
- Uppercase SQL keywords, lowercase semantic placeholders, four-space indentation
- Use name for the primary object, typed names for other objects; _statement / _expression / _definition / _clause / _option / _action describe actual roles
- CASE, WHERE, PARTOFIS, ONEOFIS and STATEMENT are consumer conventions, not parser built-ins
- Keep independent optional clauses separate; use repetition only for genuine lists
- Never trim syntax to match application menus or safety policy. Consumers own permissions, target locks, execution, and branch allowlists
- Keep necessary input and generation conventions in README.md. A file existing does not imply full coverage
- Do not edit or commit generated *.snf.json
- After edits, agents must not run tests or type checks automatically. The user triggers them when needed. Structural parser validation is also opt-in. Whitespace inspection and manual source review are permitted
- Document new commands in package.json and README.md. Do not claim SQL engine or Studio validation without actually performing it
