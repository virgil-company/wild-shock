import { rw3Components, rw3Equipment, rw3Spells } from './rw3-catalog.js';

export const equipmentSlots = ['Weapon', 'Head', 'Body', 'Feet', 'Trinket'];
export const componentByName = new Map(rw3Components.map(component => [component.name, component]));
export const equipmentByName = new Map(rw3Equipment.map(item => [item.name, item]));

// The compendium's recipes are tag requirements.  A component may satisfy one
// listed tag and a wildcard accepts any remaining component.
export function recipeMatches(item, componentNames) {
  if (!item || componentNames.length !== item.recipe_cost) return false;
  const pool = componentNames.map(name => componentByName.get(name)).filter(Boolean);
  if (pool.length !== componentNames.length) return false;
  const requirements = item.recipe.flatMap(([tag, count]) => Array(count).fill(tag));
  const used = new Set();
  function assign(index) {
    if (index === requirements.length) return true;
    const tag = requirements[index];
    for (let i = 0; i < pool.length; i++) if (!used.has(i) && (tag === 'Any' || pool[i].tags.includes(tag))) {
      used.add(i); if (assign(index + 1)) return true; used.delete(i);
    }
    return false;
  }
  return assign(0);
}

export function canForge(game, name, componentNames) {
  const item = equipmentByName.get(name);
  return game.status === 'playing' && !!item && recipeMatches(item, componentNames)
    && componentNames.every(name => (game.rw3Components || []).filter(value => value === name).length >= componentNames.filter(value => value === name).length);
}

export function forge(game, name, componentNames) {
  if (!canForge(game, name, componentNames)) return false;
  const item = equipmentByName.get(name);
  for (const name of componentNames) game.rw3Components.splice(game.rw3Components.indexOf(name), 1);
  game.equipment ??= {};
  game.equipment[item.slot] = { name: item.name, components: [...componentNames] };
  return item;
}

export function addComponent(game, name) {
  if (!componentByName.has(name)) return false;
  game.rw3Components ??= []; game.rw3Components.push(name); return true;
}

export function catalogueCounts() { return { spells: rw3Spells.length, equipment: rw3Equipment.length, components: rw3Components.length }; }
