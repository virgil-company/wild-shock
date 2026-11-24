export const materials = ['spark', 'ember', 'crystal'];
export const artifacts = [
  { id: 'stormglass', name: 'Stormglass Rod', recipe: { spark: 2, crystal: 1 }, description: 'Storm and Astral spells deal +4 damage.', schools: [0, 8], damage: 4 },
  { id: 'cinderheart', name: 'Cinderheart', recipe: { ember: 2, spark: 1 }, description: 'Ember spells deal +4 damage. Each defeated enemy heals 2 HP.', schools: [1], damage: 4 },
  { id: 'rime-mantle', name: 'Rime Mantle', recipe: { crystal: 2, ember: 1 }, description: 'Begin each realm with 8 ward. Frost lasts 1 extra turn.' },
  { id: 'prism', name: 'Wayfarer Prism', recipe: { crystal: 2, spark: 1 }, description: 'All spells gain +1 range and +2 maximum charges.' },
  { id: 'thorn-ring', name: 'Thorn Ring', recipe: { ember: 1, crystal: 1 }, description: 'After a spell hits, poison its targets for at least 3 turns.' },
  { id: 'storm-bell', name: 'Storm Bell', recipe: { spark: 2, ember: 2 }, description: 'Every third spell deals 5 damage to all visible enemies within 4 tiles.' },
];
export const hasArtifact = (game, id) => (game.artifacts || []).includes(id);
export function enhanceSpell(game, spell) {
  for (const item of artifacts) if (hasArtifact(game, item.id) && item.schools?.includes(spell.school)) spell.damage += item.damage;
  if (hasArtifact(game, 'prism')) { spell.range++; spell.maxCharges += 2; }
  if (hasArtifact(game, 'rime-mantle') && spell.effect === 'freeze') spell.duration++;
  return spell;
}
export function canCraft(game, id) {
  const item = artifacts.find(a => a.id === id);
  return !!item && game.status === 'playing' && !hasArtifact(game, id) && Object.entries(item.recipe).every(([key, count]) => game.components[key] >= count);
}
