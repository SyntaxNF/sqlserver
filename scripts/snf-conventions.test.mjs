import { parser as parserModule } from './parser-runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectDocument } from './snf-conventions.mjs';
const { SNFDocumentParser, NodeType } = parserModule;
const parser = new SNFDocumentParser();
const inspect = source => inspectDocument(parser.parse(source), NodeType);
const good = '# CASE NORMAL\nSELECT item\n\n# WHERE item\nvalue_expression';
test('local nodes resolve and typed inputs stay open', () => {
    const result = inspect(good);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.inputs, ['value_expression']);
    assert.deepEqual(result.localReferences, ['item']);
});
test('single form may have an implicit entry point', () => assert.deepEqual(inspect('SELECT item\n\n# WHERE item\nvalue_expression').errors, []));
test('PARTOFIS and ONEOFIS own subsequent alternative blocks', () => {
    for (const kind of ['PARTOFIS', 'ONEOFIS']) assert.deepEqual(inspect(`# CASE A\nSELECT item\n\n# ${kind} item\nA\n\nB`).errors, []);
});
test('recursive local references terminate the audit and remain explicit', () => {
    const result = inspect('# CASE A\nSELECT item\n\n# PARTOFIS item\nvalue_expression\n\n( item )');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.recursiveDefinitions, ['item']);
});
const invalid = [
    ['duplicate CASE', '# CASE A\nA\n\n# CASE A\nB', 'duplicate CASE'],
    ['duplicate definition', `${good}\n\n# WHERE item\nB`, 'duplicate definition'],
    ['unowned continuation', '# CASE A\nA\n\nB', 'unowned continuation'],
    ['empty definition', '# CASE A', 'empty definition'],
    ['multiple directives in a block', '# CASE A\nA\n# WHERE item\nB', 'one directive'],
    ['wrong directive casing', '# CASE lower\nA', 'casing'],
    ['unknown directive', '# WHER item\nA', 'malformed directive'],
    ['unreachable definition', '# CASE A\nA\n\n# WHERE item\nB', 'unreachable'],
    ['empty alternative', '# CASE A\n{ A | }', 'empty alternative'],
    ['bare split', '# CASE A\nA | B', 'unescaped alternative'],
    ['bare repeat', '# CASE A\nitem ...', 'outside a postfix loop'],
    ['orphan loop', '# CASE A\n[ ... ]', 'no preceding item'],
    ['invalid STATEMENT', '# CASE A\nquery_statement\n\n# STATEMENT query_statement\nselect', 'statement category'],
];
for (const [name, source, message] of invalid) test(`reject ${name}`, () => assert.ok(inspect(source).errors.some(error => error.includes(message))));
test('real parser rejects unclosed syntax', () => assert.throws(() => inspect('# CASE A\n[ A'), /Unclosed block/));
test('real parser rejects malformed repeat', () => assert.throws(() => inspect('# CASE A\nitem [....]'), /three dots/));
test('fixed mixed-case literal and pseudo-column are not inputs', () => {
    const source = "# CASE A\nSELECT 'OpenAI', $action, 'lsn:lsn_number', 'user_text'";
    const result = inspectDocument(parser.parse(source), NodeType, ["'OpenAI'", '$action', "'lsn:"]);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.inputs, ['lsn_number', 'user_text']);
});
test('stale literal contracts fail', () => assert.ok(inspectDocument(parser.parse(good), NodeType, ["'missing'"]).errors.some(e => e.includes('stale'))));

test('invalid literal config fails without hanging', () => {
    for (const snippets of [[''], [null], ['x', 'x'], 'x']) assert.throws(() => inspectDocument(parser.parse(good), NodeType, snippets), /unique nonempty strings/);
});
