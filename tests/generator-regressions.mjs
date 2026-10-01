import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parser } from '../scripts/parser-runtime.mjs';
import { files, root, source, document, inspect, inspectSource, visit, significant } from '../scripts/check-generator.mjs';
import { fixture, parse } from '../scripts/generator-fixture.mjs';
const { NodeType: T, exchangeLoopNode } = parser;
for (const file of files) test(`verified parser and generator AST: ${file}`, () => assert.deepEqual(inspect(file).errors, []));
test('preserve all 302 definitions and 377 inventory entries', () => {
    assert.equal(files.length, 302);
    const inventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/inventory.json'), 'utf8'));
    assert.equal(inventory.length, 377);
    assert.equal(inventory.filter(item => item.status === 'partial').length, 76);
    assert.deepEqual([...new Set(inventory.map(item => item.file).filter(Boolean))].sort(), files);
});
test('LOOP consumes its entire member and supports zero entries', () => {
    const nodes = significant(parse('item [, ...]').children);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].type, T.LOOP);
    assert.equal(nodes[0].children[0].content, 'item');
});
test('detect detached literal loops and redundant pure-loop wrappers', () => {
    for (const text of ["SELECT 'item' [, ...]", 'SELECT ( item ) [, ...]'])
        assert.ok(inspectSource(`# https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver17\n\n${text}\n`).errors.some(error => error.includes('detached')));
    assert.ok(inspectSource('# https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver17\n\nSELECT [ item [, ...] ]\n').errors.some(error => error.includes('pure optional')));
});
test('whole keyword/bracket optionals remain meaningful', () => {
    for (const text of ['SELECT [ WITH ( item [, ...] ) ]', 'SELECT [ ( item [, ...] ) ]', 'SELECT [ WHERE boolean_expression ]'])
        assert.deepEqual(inspectSource(`# https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver17\n\n${text}\n`).errors, []);
});
const indexValue = prefix => ({ index = 0 }) => `${prefix}${index + 1}`;
const loopCases = [
    ['create/database.snf', 'snapshot_file_definition', { logical_file: indexValue('file'), file_path: indexValue('/data/file') }, n => Array.from({length:n},(_,i)=>`( NAME = file${i+1} , FILENAME = '/data/file${i+1}' )`).join(', ')],
    ...['create','alter'].flatMap(family => [
        [`${family}/availability-group.snf`, 'routing_server', {server_instance:indexValue('sql')}, n=>Array.from({length:n},(_,i)=>`'sql${i+1}'`).join(', ')],
        [`${family}/availability-group.snf`, 'listener_ip_definition', {ipv4_address:({index=0})=>`10.0.0.${index+1}`,ipv4_mask:'255.255.255.0'}, n=>Array.from({length:n},(_,i)=>`( '10.0.0.${i+1}' , '255.255.255.0' )`).join(', ')],
        [`${family}/event-session.snf`, 'event_attribute_assignment', {event_attribute:indexValue('attr'),event_value:({index=0})=>String(index+1)}, n=>Array.from({length:n},(_,i)=>`attr${i+1} = ${i+1}`).join(', ')],
        [`${family}/event-session.snf`, 'target_parameter_assignment', {target_parameter:indexValue('param'),event_value:({index=0})=>`'value${index+1}'`}, n=>Array.from({length:n},(_,i)=>`param${i+1} = 'value${i+1}'`).join(', ')],
    ]),
    ['create/json-index.snf','json_path_literal',{json_path:({index=0})=>`$.field${index+1}`},n=>Array.from({length:n},(_,i)=>`'$.field${i+1}'`).join(', ')],
    ['query/select.snf','hint_name_literal',{hint_name:indexValue('hint')},n=>Array.from({length:n},(_,i)=>`'hint${i+1}'`).join(', ')],
];
for (const [file, member, values, expected] of loopCases) for (const count of [0,1,2]) test(`${file}: whole ${member} x${count}`, () => {
    const f = fixture(file);
    assert.equal(f.render(f.loop(member), {values,count:()=>count}), expected(count));
});
for (const family of ['create','alter']) for (const count of [0,1,2]) test(`${family} procedure parameters x${count}; free body remains an input`, () => {
    const f=fixture(`${family}/procedure.snf`);
    const body='BEGIN SELECT 1; SELECT N\'free body\'; END';
    const values={name:'dbo.p',parameter_definition:({index=0})=>`@p${index+1} int`,statement_block:body};
    const node=f.block('# CASE TSQL');
    assert.equal(f.render(node,{values,count:member=>member==='parameter_definition'?count:0}),`${family.toUpperCase()} PROC dbo.p${count?' '+Array.from({length:count},(_,i)=>`@p${i+1} int`).join(', '):''} AS ${body}`);
});
test('one SELECT specification replaces compatibility-only full variants',()=>{
    const s=source('query/select.snf');
    assert.deepEqual([...s.matchAll(/^# CASE (.+)$/gm)].map(m=>m[1]),['SELECT','SET_OPERATION']);
    assert.equal((s.match(/^SELECT /gm)||[]).length,1);
    assert.match(s,/\[ TOP \( row_count_expression \) \[ PERCENT \] \[ WITH TIES \] \]/);
    assert.match(s,/# WHERE order_by_clause\nORDER BY[\s\S]*?\[ OFFSET[\s\S]*?\[ FETCH/);
});
for (const input of [
    {name:'plain',top:false,order:false,offset:false,fetch:false,expected:'SELECT 1'},
    {name:'TOP PERCENT WITH TIES',top:true,percent:true,ties:true,order:true,expected:'SELECT TOP ( 5 ) PERCENT WITH TIES 1 ORDER BY col'},
    {name:'OFFSET only',order:true,offset:true,expected:'SELECT 1 ORDER BY col OFFSET 2 ROW'},
    {name:'OFFSET FETCH',order:true,offset:true,fetch:true,expected:'SELECT 1 ORDER BY col OFFSET 2 ROW FETCH FIRST 3 ROW ONLY'},
]) test(`SELECT fixture: ${input.name}`,()=>{
    const f=fixture('query/select.snf');
    const values={select_item:'1',row_count_expression:'5',order_by_expression:'col',offset_expression:'2',fetch_expression:'3'};
    const include=node=>({TOP:input.top,PERCENT:input.percent,'WITH TIES':input.ties,order_by_clause:input.order,OFFSET:input.offset,FETCH:input.fetch}[node.content.trim().split(/\s*\(/)[0]] ?? (node.content.trim().startsWith('TOP ')?input.top:node.content.trim().startsWith('OFFSET ')?input.offset:node.content.trim().startsWith('FETCH ')?input.fetch:false));
    assert.equal(f.render(f.block('# CASE SELECT'),{values,include}),input.expected);
});
test('set operations share OFFSET/FETCH tail and free nested queries',()=>{
    const f=fixture('query/select.snf');
    const values={query_operand:({index})=>index===undefined?'SELECT 1':'SELECT 2',order_by_expression:'col',offset_expression:'0',fetch_expression:'10'};
    const include=node=>/^(order_by_clause|OFFSET|FETCH)/.test(node.content.trim());
    assert.equal(f.render(f.block('# CASE SET_OPERATION'),{values,include}),'SELECT 1 UNION SELECT 2 ORDER BY col OFFSET 0 ROW FETCH FIRST 10 ROW ONLY');
});
for (const name of ['update','delete']) test(`${name}: CURRENT OF and OPTION follow FROM`,()=>{
    const f=fixture(`query/${name}.snf`);
    const node=f.block(`# CASE ${name.toUpperCase()}`);
    const values={update_target:'t',delete_target:'t',assignment:'col = 2',from_expression:'dbo.source AS s',cursor_name:'c',query_hint:'RECOMPILE'};
    const include=node=>/^(FROM |WHERE |GLOBAL$|OPTION )/.test(node.content.trim());
    const choose=choices=>choices.some(n=>n.content.trim().startsWith('CURRENT OF'))?choices.findIndex(n=>n.content.trim().startsWith('CURRENT OF')):0;
    assert.equal(f.render(node,{values,include,choose}),`${name.toUpperCase()} t${name==='update'?' SET col = 2':''} FROM dbo.source AS s WHERE CURRENT OF GLOBAL c OPTION ( RECOMPILE )`);
});
for (const [label, branch, expected] of [
    ['VALUES',0,'VALUES ( 1 ), ( 2 )'],
    ['query input',0,'SELECT 1 UNION ALL SELECT 2'],
    ['DEFAULT VALUES',1,'DEFAULT VALUES'],
    ['EXECUTE input',2,'EXEC dbo.p'],
]) test(`INSERT shared prefix preserves ${label}`,()=>{
    const f=fixture('query/insert.snf');
    const values={table:'t',row_definition:({index=0})=>`( ${index+1} )`,query_statement:'SELECT 1 UNION ALL SELECT 2',execute_statement:'EXEC dbo.p'};
    const choose=choices=>choices.length===3?branch:label==='query input'&&choices.some(n=>n.content.trim()==='query_statement')?1:0;
    assert.equal(f.render(f.block('# CASE INSERT'),{values,choose,count:()=>2}),`INSERT t ${expected}`);
});
for (const target of ['FILE','APPLICATION_LOG','SECURITY_LOG']) test(`SERVER AUDIT shared shell preserves ${target}`,()=>{
    const file='create/server-audit.snf', f=fixture(file);
    const node=exchangeLoopNode(document(file).blocks.find(block=>block.content.trim()).ast);
    const choose=choices=>choices.some(n=>n.content.trim().startsWith('FILE ('))?(target==='FILE'?0:1):choices.findIndex(n=>n.content.trim()===target)>=0?choices.findIndex(n=>n.content.trim()===target):0;
    assert.equal(f.render(node,{values:{name:'audit',file_path:'/logs/'},choose}),`CREATE SERVER AUDIT audit TO ${target==='FILE'?"FILE ( FILEPATH = '/logs/' )":target}`);
});
for (const enabled of [false,true]) test(`ALTER COLUMN retains optional ONLINE: ${enabled}`,()=>{
    const f=fixture('alter/table.snf');
    assert.equal(f.render(f.block('# CASE ALTER_COLUMN'),{values:{name:'t',colname:'c',data_type:'decimal(5,2)'},include:node=>enabled&&node.content.trim().startsWith('WITH ( ONLINE')}),`ALTER TABLE t ALTER COLUMN c decimal(5,2)${enabled?' WITH ( ONLINE = ON )':''}`);
});
test('quoted repeated inputs preserve escaped apostrophes and embedded spaces',()=>{
    const f=fixture('create/availability-group.snf');
    assert.equal(f.render(f.loop('routing_server'),{values:{server_instance:({index})=>index===0?"sql''one":"sql two"},count:()=>2}),"'sql''one', 'sql two'");
});

test('free SQL inputs bypass whitespace and comma normalization',()=>{
    const f=fixture('create/procedure.snf');
    const body="BEGIN\n-- retain this comment boundary\nSELECT [two  spaces], N'a,  b';\nEND";
    assert.equal(f.render(f.block('# CASE TSQL'),{values:{name:'[p  name]',statement_block:body},count:()=>0}),`CREATE PROC [p  name] AS ${body}`);
});
