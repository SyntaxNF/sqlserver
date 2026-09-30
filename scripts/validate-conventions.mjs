import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectDocument } from './snf-conventions.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.SNF_PARSER_MODULE) throw new Error('Set SNF_PARSER_MODULE; see docs/validation.md');
const { SNFDocumentParser, NodeType } = await import(pathToFileURL(resolve(process.env.SNF_PARSER_MODULE)).href);
const parser = new SNFDocumentParser();
const fixedLiterals = JSON.parse(await readFile(resolve(root, 'docs/snf-fixed-literals.json'), 'utf8'));
const files = {};
const errors = [];
const counts = {};
for (const family of ['query', 'create', 'alter', 'drop', 'transaction', 'other']) {
    for (const file of (await readdir(resolve(root, family))).sort()) {
        if (!file.endsWith('.snf')) continue;
        const path = `${family}/${file}`;
        const source = await readFile(resolve(root, path), 'utf8');
        if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.snf$/.test(file)) errors.push(`${path}: invalid filename`);
        if (!/^# https:\/\/learn\.microsoft\.com\/.*[?&]view=sql-server-ver17(?:&.*)?\n/.test(source)) errors.push(`${path}: missing version-scoped source URL`);
        source.split('\n').forEach((line, i) => {
            if (/\t| +$/.test(line) || (line.match(/^ */)[0].length % 4)) errors.push(`${path}:${i + 1}: whitespace/indentation`);
        });
        try {
            const result = inspectDocument(parser.parse(source), NodeType, fixedLiterals[path] ?? []);
            errors.push(...result.errors.map(error => `${path}: ${error}`));
            files[path] = result;
            for (const [key, value] of Object.entries(result.counts)) counts[key] = (counts[key] ?? 0) + value;
        } catch (error) { errors.push(`${path}: ${error.message}`); }
    }
}
for (const file of Object.keys(fixedLiterals)) if (!files[file]) errors.push(`fixed-literal contract: missing ${file}`);
const inventory = JSON.parse(await readFile(resolve(root, 'docs/inventory.json'), 'utf8'));
for (const item of inventory) if (item.status !== 'not-applicable' && !files[item.file]) errors.push(`inventory: missing ${item.file}`);
for (const file of Object.keys(files)) if (!inventory.some(item => item.file === file)) errors.push(`inventory: unlisted ${file}`);
const report = { scope: 'SNF physical structure and repository conventions only; inputs are not unresolved-reference errors or validated SQL', documents: Object.keys(files).length, contentBlocks: Object.values(files).reduce((n, f) => n + f.contentBlocks, 0), directives: counts, inputOccurrences: Object.values(files).reduce((n, f) => n + f.inputs.length, 0), uniqueInputNames: new Set(Object.values(files).flatMap(f => f.inputs)).size, errors, files };
if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, files: undefined }, null, 2));
if (errors.length) process.exitCode = 1;
