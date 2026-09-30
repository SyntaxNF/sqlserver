// Opt-in structural check only. Never executes SQL or resolves CASE/WHERE semantics.
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const parserPath = process.env.SNF_PARSER_MODULE;
if (!parserPath) {
    throw new Error('Set SNF_PARSER_MODULE to the absolute path of a built SyntaxNF/parser dist/esm/index.mjs. See docs/validation.md.');
}
const { SNFDocumentParser } = await import(pathToFileURL(resolve(parserPath)).href);
if (typeof SNFDocumentParser !== 'function') {
    throw new Error('The supplied parser must export SNFDocumentParser. See the pinned source revision in docs/validation.md.');
}
const families = ['query', 'create', 'alter', 'drop', 'transaction', 'other'];
const parser = new SNFDocumentParser();
let count = 0;
for (const family of families) {
    for (const file of (await readdir(resolve(root, family))).sort()) {
        if (!file.endsWith('.snf')) continue;
        const source = await readFile(resolve(root, family, file), 'utf8');
        try {
            const document = parser.parse(source);
            if (!document.blocks.some(block => block.content.trim())) {
                throw new Error('No nonempty definition blocks');
            }
            count++;
        } catch (error) {
            throw new Error(`${family}/${file}: ${error.message}`, { cause: error });
        }
    }
}
console.log(`Parsed ${count} SNF documents. This does not validate T-SQL or directive resolution.`);
