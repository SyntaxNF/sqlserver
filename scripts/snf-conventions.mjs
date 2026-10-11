// Repository conventions layered on the real parser AST; not a SQL validator/binder.
export function inspectDocument(document, NodeType, fixedSnippets = []) {
    const errors = [];
    if (!Array.isArray(fixedSnippets) || fixedSnippets.some(s => typeof s !== 'string' || !s.length) || new Set(fixedSnippets).size !== fixedSnippets.length) throw new Error('Fixed snippets must be unique nonempty strings');
    const definitions = new Map(document.definitions.flatMap(d => d.names.map(name => [name, d])));
    const counts = {};
    for (const entry of document.entries) if (entry.name) counts.CASE = (counts.CASE ?? 0) + 1;
    for (const definition of document.definitions) counts[definition.kind] = (counts[definition.kind] ?? 0) + 1;
    for (const snippet of fixedSnippets) if (!document.blocks.some(block => block.content.includes(snippet))) errors.push(`stale fixed-literal contract: ${snippet}`);
    const spans = document.blocks.map(block => fixedSnippets.flatMap(snippet => {
        const found = [];
        for (let start = block.content.indexOf(snippet); start >= 0; start = block.content.indexOf(snippet, start + snippet.length)) found.push([start, start + snippet.length]);
        return found;
    }));
    const inputs = new Set();
    const visit = node => {
        if (node.type === NodeType.VARIABLE && !spans[node.sourceBlock].some(([start,end]) => start <= node.start && node.end <= end)) inputs.add(node.content);
        node.children?.forEach(visit);
    };
    const items = [...document.entries,...document.definitions];
    items.forEach(item => visit(item.ast));
    if (!document.entries.length) errors.push('no statement entry point');
    if (document.entries.filter(entry => !entry.name).length > 1) errors.push('unowned continuation');
    const reachable = new Set();
    const follow = name => {
        if (!definitions.has(name) || reachable.has(name)) return;
        const definition = definitions.get(name);
        definition.names.forEach(name => reachable.add(name));
        definition.dependencies.forEach(follow);
    };
    document.entries.forEach(entry => entry.dependencies.forEach(follow));
    for (const name of definitions.keys()) if (!reachable.has(name)) errors.push(`unreachable local definition ${name}`);
    return { errors, counts, contentBlocks: document.blocks.filter(b => b.content.trim()).length,
        localReferences: [...new Set(items.flatMap(item => item.dependencies))].sort(), inputs: [...inputs].sort(),
        recursiveDefinitions: document.definitions.filter(d => d.recursive).flatMap(d => d.names) };
}
