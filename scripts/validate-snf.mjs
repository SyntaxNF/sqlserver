import { parser as parserModule } from './parser-runtime.mjs';
// Opt-in structural check only. Never executes SQL or resolves CASE/WHERE semantics.
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { SNFDocumentParser } = parserModule;
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
