// Syntax and generator-facing AST checks only; this does not validate T-SQL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parser, parserRevision } from './parser-runtime.mjs';

const { SNFDocumentParser, SNFParser, exchangeLoopNode, NodeType: T } = parser;
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
    const declared = new Set(), cases = new Set();
    let mode;
    for (const block of doc.blocks) {
        counts.blocks++;
        if (text.slice(block.start, block.end) !== block.lines.map(line => line.content + line.ending).join('')) errors.push(`document block span mismatch at line ${block.startLine}`);
        const directives = [...block.comment.matchAll(/^# (CASE|WHERE|ONEOFIS|PARTOFIS|STATEMENT) (.+)$/gm)];
        if (directives.length > 1) errors.push(`multiple directives in block at line ${block.startLine}`);
        if (directives.length) {
            const [, kind, names] = directives[0]; mode = kind;
            for (const name of names.split(/\s*,\s*/)) {
                if (kind === 'CASE') {
                    counts.cases++;
                    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) errors.push(`invalid CASE ${name}`);
                    if (cases.has(name)) errors.push(`duplicate CASE ${name}`);
                    cases.add(name);
                } else {
                    counts.helperDefinitions++;
                    if (!/^[a-z][a-z0-9_]*$/.test(name)) errors.push(`invalid helper ${name}`);
                    if (declared.has(name)) errors.push(`duplicate helper ${name}`);
                    declared.add(name);
                }
            }
        }
        visit(block.ast, node => {
            counts.astNodes++;
            if (!Number.isInteger(node.start) || !Number.isInteger(node.end) || node.start < 0 || node.end < node.start || node.end > block.content.length || block.content.slice(node.start, node.end) !== node.raw) errors.push(`AST raw/span mismatch at line ${block.startLine}`);
            if (node.type === T.VARIABLE && !/^[a-z][a-z0-9_]*$/.test(node.content)) errors.push(`invalid placeholder ${node.content} at line ${block.startLine}`);
        });
        if (mode === 'ONEOFIS' && block.content) for (const line of block.content.split('\n')) {
            try { new SNFParser().parse(line); }
            catch (error) { errors.push(`ONEOFIS candidate split across lines at ${block.startLine}: ${error.message}`); }
        }
        visit(exchangeLoopNode(block.ast), node => {
            if (node.type === T.LOOP) {
                counts.loops++;
                if (!Array.isArray(node.ast)) errors.push(`detached postfix LOOP at line ${block.startLine}: ${block.content.replace(/\s+/g, ' ')}`);
            }
            const children = unwrapSingle(node);
            if (node.type === T.OPTIONAL && children.length === 1 && children[0].type === T.LOOP) errors.push(`pure optional LOOP wrapper at line ${block.startLine}: ${node.raw}`);
        });
    }
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
    console.log(JSON.stringify({ parserRevision, parserInput: 'verified src/index.ts', files: files.length, ...counts, errors }, null, 2));
    if (errors.length) process.exitCode = 1;
}
