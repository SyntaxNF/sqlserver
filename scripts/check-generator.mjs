// Syntax and generator-facing AST checks only; this does not validate T-SQL.
import { inspectContract } from './snf-contract.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parser, parserRevision, parserInput } from './parser-runtime.mjs';

const { SNFDocumentParser, NodeType: T } = parser;
export const root = path.resolve(process.env.SNF_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const families = ['create', 'alter', 'drop', 'query', 'transaction', 'other'];
export const files = families.flatMap(dir => fs.readdirSync(path.join(root, dir))
    .filter(name => name.endsWith('.snf')).map(name => `${dir}/${name}`)).sort();
export const source = file => fs.readFileSync(path.join(root, file), 'utf8');
export const document = file => new SNFDocumentParser().parse(source(file));
export function visit(node, fn) { fn(node); (node.children ?? []).forEach(child => visit(child, fn)); }
export const significant = nodes => (nodes ?? []).filter(node => ![T.BLANK, T.WRAP].includes(node.type));

export function unwrapSingle(node) {
    let children = significant(node.children);
    while (children.length === 1 && [T.ROOT, T.ENUM, T.GROUP, T.COLLECTION].includes(children[0].type)) children = significant(children[0].children);
    return children;
}

export function inspectSource(text, file = '<fixture>') {
    const errors = [];
    const counts = { blocks: 0, cases: 0, helperDefinitions: 0, astNodes: 0, loops: 0 };
    if (!/^# https:\/\/learn\.microsoft\.com\/[^\r\n]+[?&]view=sql-server-ver17[^\r\n]*\r?\n/.test(text)) errors.push('missing official SQL Server 17.x first-line source');
    if (/[ \t]+$/m.test(text) || !text.endsWith('\n')) errors.push('whitespace/newline error');
    if (file !== '<fixture>' && !/^(?:[a-z]+\/)?[a-z][a-z0-9-]*\.snf$/.test(file)) errors.push('invalid lowercase hyphenated file name');
    let doc;
    try { doc = new SNFDocumentParser().parse(text); }
    catch (error) { return { errors: [...errors, `parser: ${error.message}`], counts }; }
    if (doc.content !== text || doc.lines.map(line => line.content + line.ending).join('') !== text) errors.push('source round-trip mismatch');
    for (const line of doc.lines) {
        if (text.slice(line.start, line.end) !== line.content + line.ending) errors.push(`document line span mismatch at line ${line.line}`);
    }
    errors.push(...inspectContract(doc, parser));
    counts.blocks = doc.blocks.length;
    counts.cases = doc.entries.filter(entry => entry.name).length;
    counts.helperDefinitions = doc.definitions.flatMap(definition => definition.names).length;
    for (const item of [...doc.entries, ...doc.definitions]) visit(item.ast, node => {
        counts.astNodes++;
        if (node.type === T.LOOP) counts.loops++;
        if (node.type === T.VARIABLE && !/^[a-z][a-z0-9_]*$/.test(node.content)) errors.push(`invalid placeholder ${node.content}`);
    });
    return { errors, counts };
}
export const inspect = file => inspectSource(source(file), file);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const counts = { blocks: 0, cases: 0, helperDefinitions: 0, astNodes: 0, loops: 0 };
    const errors = files.flatMap(file => {
        const result = inspect(file);
        for (const key of Object.keys(counts)) counts[key] += result.counts[key];
        return result.errors.map(error => `${file}: ${error}`);
    });
    console.log(JSON.stringify({ parserRevision, parserInput, files: files.length, ...counts, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
}
