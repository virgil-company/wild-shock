export const schools = [
  ['Storm', '#d4cc79', 'ϟ', 'shock'], ['Ember', '#ee9270', '♨', 'burn'],
  ['Frost', '#8fc9dd', '❄', 'freeze'], ['Verdant', '#9dc68c', '♧', 'poison'],
  ['Void', '#ae99d8', '◈', 'drain'], ['Solar', '#e5c586', '☼', 'heal'],
  ['Blood', '#d57d88', '♦', 'drain'], ['Stone', '#c0af94', '⬡', 'shield'],
  ['Astral', '#a4a5e3', '✧', 'shock'], ['Tide', '#78bdb4', '≈', 'heal'],
  ['Spirit', '#c6d7b5', '♙', 'shield'], ['Venom', '#b3c678', '✳', 'poison'],
].map(([name, color, icon, effect], id) => ({ id, name, color, icon, effect }));
export const paths = [
  ['Bolt', 'power', 'Focused damage', 2], ['Nova', 'radius', 'Area of effect', 1],
  ['Lance', 'range', 'Casting distance', 1], ['Chain', 'chain', 'Additional targets', 1],
  ['Ward', 'armor', 'Damage protection', 1], ['Well', 'charges', 'Spell reserves', 1],
  ['Hex', 'duration', 'Status duration', 1], ['Surge', 'power', 'Amplified damage', 3],
  ['Bloom', 'vitality', 'Maximum health', 3], ['Echo', 'echo', 'Repeat damage', 1],
  ['Siphon', 'leech', 'Health on hit', 1], ['Rift', 'pierce', 'Resistance penetration', 1],
].map(([name, stat, description, amount], id) => ({ id, name, stat, description, amount }));
export const nodes = schools.flatMap(school => paths.flatMap(path => Array.from({ length: 16 }, (_, index) => ({
  id: `${school.id}-${path.id}-${index + 1}`, school: school.id, path: path.id, rank: index + 1,
  name: `${school.name} ${path.name} ${index + 1}`, cost: 1 + Math.floor(index / 4),
  parent: index ? `${school.id}-${path.id}-${index}` : null,
  description: `+${path.amount} ${path.description.toLowerCase()} for ${school.name} magic.${index === 0 ? ` Unlocks ${school.name} ${path.name}.` : ''}`,
}))));
export const nodeMap = new Map(nodes.map(node => [node.id, node]));
export function getStats(learned, school) {
  const result = { power: 0, radius: 0, range: 0, chain: 0, armor: 0, charges: 0, duration: 0, vitality: 0, echo: 0, leech: 0, pierce: 0 };
  for (const id of learned) { const node = nodeMap.get(id); if (node?.school === school) { const path = paths[node.path]; result[path.stat] += path.amount; } }
  return result;
}
export function spellInfo(schoolId, pathId, learned) {
  const school = schools[schoolId], path = paths[pathId], stats = getStats(learned, schoolId);
  return { id: `${schoolId}-${pathId}`, school: schoolId, path: pathId, name: `${school.name} ${path.name}`, color: school.color, icon: school.icon,
    damage: 7 + stats.power + (pathId === 2 ? 4 : 0), range: 5 + stats.range,
    radius: pathId === 1 ? 2 + Math.floor(stats.radius / 4) : Math.floor(stats.radius / 6),
    chains: (pathId === 3 ? 2 : 0) + Math.floor(stats.chain / 3), maxCharges: 7 + stats.charges,
    duration: 2 + Math.floor(stats.duration / 3), stats, effect: school.effect };
}
