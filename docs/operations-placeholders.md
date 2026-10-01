# Operations/admin and Service Broker input contracts

Scope note: the contexts and SQL restrictions below are reference information, not mandatory checks that an SNF generator must implement. Free expressions, bodies and reusable queries are legitimate inputs. The database or an optional consumer validation layer can enforce semantic rules; templates do not duplicate whole statements to encode compatibility matrices.

Scope: SQL Server 2025 (17.x), GA engine features. This document belongs to the operations inventory and complements the integrated coverage document. Definitions are syntax models, never evidence that an operation is safe or executable. The subsequent user-triggered parser/convention validation is recorded in [validation-report.md](validation-report.md); no SQL Server or Studio execution was run.

## Reading status

- supported: the enumerated statement form is structurally represented, with ordinary identifier/literal/value leaves. It does not mean every semantic combination is accepted or engine-tested
- partial: a known branch, option family, complex expression or interaction remains incomplete; the exact row notes in operations-inventory.json take precedence
- not-applicable: absent statement or cloud/product-specific command intentionally outside this engine scope

## Common leaf contracts

- name is the primary object's correctly delimited identifier. database, table, view, index, queue, procedure, pool, user, service, contract and other object leaves refer to existing or named objects; multipart qualification is allowed only where the statement permits it. Default Broker contract/message and Resource Governor pool names are identifiers, not freely interchangeable keywords
- *_variable, variable, table_variable, dialog_variable and group_variable include their @ sigil and have the required declared SQL type. SQL keyword text must not be supplied as arbitrary identifiers
- Quoted placeholders stand for the contents of SQL string literals, not already quoted text. Escape single quotes. string_value and device_value offer explicit string-literal versus @variable choices. file_value, filegroup_value, os_file_value, logical_file_value, undo_file_value, directory_value, datetime_value and date_value accept only the documented string/variable atom, never a whole SQL clause
- Numeric leaves (percentage, count, milliseconds, seconds, maxdop, ids, memory/file sizes and trace_flag) are integer/numeric atoms where documented; ranges differ per option. Memory/CPU percentages, tempdb limits and pool allocations have cross-field constraints
- Some WITH/SET settings exclude duplicate names or conflicting alternatives in SQL. Repetition represents the comma-separated list surface; it does not enforce semantic cardinality. Broker related-conversation versus related-group, repair versus NOINDEX, PHYSICAL_ONLY versus DATA_PURITY and compression/checksum/recovery alternatives need context validation
- Uniqueidentifier handles, plan/sql handles, UOW, page lists (file:page pairs), backup set ids, paths, addresses, broker GUIDs and service names need their documented type/encoding. Page lists remain an opaque quoted list

## Remaining opaque or partial structures

- event_predicate_expression is the Extended Events predicate grammar, not arbitrary SQL WHERE; event/action/target identifiers and customizable attributes must be drawn from installed XE packages. Empty event_settings is invalid when parentheses are emitted. Server scope is used; Azure database-scoped XE sessions are excluded
- connection_options is the documented semicolon-delimited availability-group/FCI connection-string value; keys and certificate values are not expanded. Replica/group counts, routing-list limits, cluster type and edition restrictions are not encoded. Distributed AG option combinations and stateful transitions require further validation
- endpoint ALTER currently uses create-style TCP/payload definitions; partial alterations that omit LISTENER_PORT or mirroring ROLE need expansion. AUTHORIZATION is excluded from ALTER because the official argument description forbids it; TCP TSQL encryption is retained. HTTP/SOAP is not supported; legacy RC4 values are documented/deprecated and have compatibility limits
- CREATE DATABASE attach file syntax covers optional NAME/FILENAME, while advanced attach filespec fields and all cross-file/containment constraints are not exhaustive. ALTER DATABASE covers common SET/file/filegroup/HADR/mirroring families; option combinations are not fully validated. Stretch removed features, Edge DATA_RETENTION and cloud-only editions/replication are excluded
- ALTER DATABASE SCOPED CONFIGURATION excludes cloud-only ALLOW_BUILTIN_TVF_IN_ALL_COMPAT_LEVELS, ALLOW_STALE_VECTOR_INDEX and XTP statistics configurations. PREVIEW_FEATURES is excluded by the GA-only policy. New options are not admitted merely because they appear on the shared page
- BACKUP/RESTORE model database/log/file/filegroup/page/snapshot and auxiliary restore forms. Device/VDI-specific options and partial-restore point-in-time combinations are not exhaustive. Restore file branch uses an explicit recovery selection. max mirror count, stripe consistency, chain/LSN validity, STOPAT legality, COPY_ONLY/DIFFERENTIAL incompatibility, encryption/certificate availability, FILE_SNAPSHOT/storage restrictions and snapshot suspension workflow require engine/runtime validation
- BACKUP SERVER/GROUP require snapshot metadata; duplicate METADATA_ONLY/SNAPSHOT combinations are a database/context concern. Security-key backup/restore is a separate family. An ordinary URL backup is supported by SQL Server even when the storage provider is cloud-hosted; it is not an Azure-SQL-only engine syntax
- DBCC commands are individually enumerated, not a DBCC free-text escape hatch. Deprecated DBREINDEX, INDEXDEFRAG, SHOWCONTIG and dllname(FREE) remain documented with warnings. REPAIR_ALLOW_DATA_LOSS and failover/restore options retain full grammar; the consumer owns confirmations and destructive-operation policy
- DBCC FLUSHAUTHCACHE is Azure SQL/Fabric-only; PDW/result-cache/SHRINKLOG commands are excluded. Undocumented DBCC commands and the trace-flag catalogue are not modeled as extra executable statements

## Source handling

Every definition links to the version-scoped official Microsoft Learn page. For workload groups, the MicrosoftDocs/sql-docs live include files docs/t-sql/includes/create-workload-group.md and alter-workload-group.md were used because the main shared page's inline syntax is Synapse-specific. CREATE/ALTER DATABASE and BACKUP/RESTORE were reviewed only for the SQL Server branch. Snapshot suspension equals-sign and MODE-only forms are corroborated by https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-transact-sql-snapshot-backup?view=sql-server-ver17. These are read-only source checks, not execution verification.

Additional source corrections: external resource pool NUMANODE affinity uses AFFINITY NUMANODE, as clarified in the official Arguments section; the shared syntax block incorrectly nests it under CPU. Linux JOIN WITH(CLUSTER_TYPE=EXTERNAL) and EXTERNAL failover mode are corroborated by https://learn.microsoft.com/en-us/sql/linux/business-continuity/availability-groups/create?view=sql-server-ver17.

## Availability-group source reconciliation

The CREATE AVAILABILITY GROUP page lists REQUIRED_SYNCHRONIZED_SECONDARIES_TO_COMMIT in its top-level syntax, but the argument section explicitly says "Not supported for CREATE AVAILABILITY GROUP" before discussing ALTER for distributed AGs from SQL Server 2022. The scope of that sentence is ambiguous. This model conservatively omits the option from CREATE and retains it only in ALTER. Distributed CREATE is a separate CASE fixed to WITH (DISTRIBUTED) and exactly two group definitions, so ordinary replica options cannot leak into it. This is an intentional partial-coverage boundary, not a claim that every regular-AG CREATE use is rejected by the engine.

CONFIGURATION_ONLY replicas have their own ENDPOINT_URL/AVAILABILITY_MODE branch without FAILOVER_MODE, following the official SQL Server Linux configuration-only example. Normal replicas retain synchronous/asynchronous availability plus failover mode. All cluster/platform prerequisites remain semantic checks.

DBCC SHOW_STATISTICS STATS_STREAM is documented as informational-only and unsupported; it is intentionally excluded from the GA statement options.
