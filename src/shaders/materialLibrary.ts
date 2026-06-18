import type { ShaderDef, GeometryKind } from '../types'

// hex → linear-ish 0..1 rgb triple
function c(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

type Gen =
  | 'metal' | 'metalworn' | 'wood' | 'planks' | 'marble' | 'granite' | 'stone'
  | 'brick' | 'fabric' | 'carbon' | 'leather' | 'glass' | 'holo' | 'liquid'
  | 'oil' | 'ice' | 'snow' | 'sand' | 'gravel' | 'ground' | 'grass' | 'asphalt'

interface Preset {
  name: string
  cat: string
  gen: Gen
  a: string
  b?: string
  rough?: number
  metal?: number
  scale?: number
}

// generators that tile better on a flat surface
const PLANE_GENS = new Set<Gen>(['brick', 'planks'])

const PRESETS: Preset[] = [
  // ───────── Ground / Terrain ─────────
  { name: 'Sand', cat: 'Ground', gen: 'sand', a: '#c2b280', b: '#a89968', rough: 0.9 },
  { name: 'Desert Sand', cat: 'Ground', gen: 'sand', a: '#e0c080', b: '#c2a060', rough: 0.95, scale: 1.2 },
  { name: 'Wet Sand', cat: 'Ground', gen: 'sand', a: '#8a7a55', b: '#6b5e40', rough: 0.45 },
  { name: 'Mud', cat: 'Ground', gen: 'ground', a: '#4a3b2a', b: '#2e241a', rough: 0.6 },
  { name: 'Dirt', cat: 'Ground', gen: 'ground', a: '#6b4f34', b: '#4a3722', rough: 0.9 },
  { name: 'Soil', cat: 'Ground', gen: 'ground', a: '#5a4631', b: '#3e2f1f', rough: 0.9 },
  { name: 'Gravel', cat: 'Ground', gen: 'gravel', a: '#8a8a86', b: '#5a5a56', rough: 0.95 },
  { name: 'Asphalt', cat: 'Ground', gen: 'asphalt', a: '#2a2a2e', b: '#3a3a40', rough: 0.85 },
  { name: 'Pavement', cat: 'Ground', gen: 'asphalt', a: '#6a6a70', b: '#4a4a50', rough: 0.8 },
  { name: 'Moss', cat: 'Ground', gen: 'grass', a: '#3a5a25', b: '#6a8a3a', rough: 0.9 },
  { name: 'Grass', cat: 'Ground', gen: 'grass', a: '#3e7a2a', b: '#6abf4a', rough: 0.9 },
  { name: 'Dry Grass', cat: 'Ground', gen: 'grass', a: '#9a8a40', b: '#b8a85a', rough: 0.9 },
  { name: 'Forest Floor', cat: 'Ground', gen: 'ground', a: '#3a2e1e', b: '#2a3a1a', rough: 0.9 },

  // ───────── Liquid ─────────
  { name: 'Water', cat: 'Liquid', gen: 'liquid', a: '#1a4a6a', b: '#2a7aaa', rough: 0.05 },
  { name: 'Ocean Water', cat: 'Liquid', gen: 'liquid', a: '#08304a', b: '#1a6a8a', rough: 0.05 },
  { name: 'River Water', cat: 'Liquid', gen: 'liquid', a: '#2a5a5a', b: '#4a8a7a', rough: 0.08 },
  { name: 'Lava', cat: 'Liquid', gen: 'liquid', a: '#6a1000', b: '#ff6a10', rough: 0.4 },
  { name: 'Mercury', cat: 'Liquid', gen: 'liquid', a: '#b8bcc4', b: '#d8dce4', rough: 0.05, metal: 1 },
  { name: 'Oil', cat: 'Liquid', gen: 'oil', a: '#101018', b: '#303048', rough: 0.1 },
  { name: 'Honey', cat: 'Liquid', gen: 'liquid', a: '#b8801a', b: '#e0a830', rough: 0.15 },
  { name: 'Ink', cat: 'Liquid', gen: 'liquid', a: '#0a0a12', b: '#1a1a2a', rough: 0.1 },
  { name: 'Molten Metal', cat: 'Liquid', gen: 'liquid', a: '#aa3000', b: '#ffcc40', rough: 0.2, metal: 1 },
  { name: 'Acid', cat: 'Liquid', gen: 'liquid', a: '#3aaa20', b: '#7aff40', rough: 0.1 },
  { name: 'Gel', cat: 'Liquid', gen: 'liquid', a: '#40a0a0', b: '#80e0e0', rough: 0.15 },
  { name: 'Slime', cat: 'Liquid', gen: 'liquid', a: '#3a8a20', b: '#7ad040', rough: 0.2 },

  // ───────── Ice & Snow ─────────
  { name: 'Ice', cat: 'Ice & Snow', gen: 'ice', a: '#aaccdd', b: '#ddeeff', rough: 0.1 },
  { name: 'Packed Snow', cat: 'Ice & Snow', gen: 'snow', a: '#e8eef2', b: '#ffffff', rough: 0.6 },
  { name: 'Fresh Snow', cat: 'Ice & Snow', gen: 'snow', a: '#f4f8fc', b: '#ffffff', rough: 0.7 },
  { name: 'Frost', cat: 'Ice & Snow', gen: 'ice', a: '#cfe0ea', b: '#ffffff', rough: 0.3 },
  { name: 'Glacier Ice', cat: 'Ice & Snow', gen: 'ice', a: '#7aa0c0', b: '#bfe0f0', rough: 0.1 },
  { name: 'Frozen Water', cat: 'Ice & Snow', gen: 'ice', a: '#9ac0d8', b: '#d0eaf8', rough: 0.08 },
  { name: 'Cracked Ice', cat: 'Ice & Snow', gen: 'ice', a: '#a0c0d0', b: '#ffffff', rough: 0.15, scale: 1.5 },
  { name: 'Wet Ice', cat: 'Ice & Snow', gen: 'ice', a: '#b0d0e0', b: '#ffffff', rough: 0.03 },
  { name: 'Blue Ice', cat: 'Ice & Snow', gen: 'ice', a: '#4a90c0', b: '#a0d0f0', rough: 0.1 },
  { name: 'Ice Crystal', cat: 'Ice & Snow', gen: 'ice', a: '#c0e0f0', b: '#ffffff', rough: 0.05, scale: 2 },

  // ───────── Fabric ─────────
  { name: 'Cotton', cat: 'Fabric', gen: 'fabric', a: '#e8e4dc', b: '#d8d4cc', rough: 0.9 },
  { name: 'Linen', cat: 'Fabric', gen: 'fabric', a: '#d8cfb8', b: '#c8bfa8', rough: 0.85 },
  { name: 'Wool', cat: 'Fabric', gen: 'fabric', a: '#b0a890', b: '#98907a', rough: 0.95 },
  { name: 'Silk', cat: 'Fabric', gen: 'fabric', a: '#d8c0d0', b: '#f0e0e8', rough: 0.2 },
  { name: 'Velvet', cat: 'Fabric', gen: 'fabric', a: '#5a1a3a', b: '#3a0a24', rough: 0.6 },
  { name: 'Denim', cat: 'Fabric', gen: 'fabric', a: '#2a4a6a', b: '#1a3a55', rough: 0.85 },
  { name: 'Canvas', cat: 'Fabric', gen: 'fabric', a: '#c8b890', b: '#b8a880', rough: 0.9 },
  { name: 'Leather', cat: 'Fabric', gen: 'leather', a: '#5a3a24', b: '#3a2416', rough: 0.5 },
  { name: 'Suede', cat: 'Fabric', gen: 'leather', a: '#6a4a34', b: '#4a3424', rough: 0.8 },
  { name: 'Felt', cat: 'Fabric', gen: 'fabric', a: '#8a8a8a', b: '#7a7a7a', rough: 0.95 },
  { name: 'Tweed', cat: 'Fabric', gen: 'fabric', a: '#6a5a44', b: '#4a3a2a', rough: 0.9 },
  { name: 'Knitted Fabric', cat: 'Fabric', gen: 'fabric', a: '#a05a5a', b: '#804a4a', rough: 0.9, scale: 1.5 },
  { name: 'Carbon Fiber', cat: 'Fabric', gen: 'carbon', a: '#1a1a1e', b: '#2a2a30', rough: 0.3, metal: 0.2 },
  { name: 'Kevlar', cat: 'Fabric', gen: 'carbon', a: '#b8a020', b: '#d8c040', rough: 0.4 },
  { name: 'Satin', cat: 'Fabric', gen: 'fabric', a: '#c0c0d0', b: '#e0e0f0', rough: 0.15 },

  // ───────── Metal ─────────
  { name: 'Gold', cat: 'Metal', gen: 'metal', a: '#d4af37', rough: 0.25, metal: 1 },
  { name: 'Silver', cat: 'Metal', gen: 'metal', a: '#cfcfcf', rough: 0.15, metal: 1 },
  { name: 'Copper', cat: 'Metal', gen: 'metal', a: '#b87333', rough: 0.3, metal: 1 },
  { name: 'Brass', cat: 'Metal', gen: 'metal', a: '#c8a050', rough: 0.3, metal: 1 },
  { name: 'Bronze', cat: 'Metal', gen: 'metal', a: '#8a6a3a', rough: 0.35, metal: 1 },
  { name: 'Iron', cat: 'Metal', gen: 'metal', a: '#7a7a80', rough: 0.5, metal: 1 },
  { name: 'Steel', cat: 'Metal', gen: 'metal', a: '#9a9aa0', rough: 0.35, metal: 1 },
  { name: 'Stainless Steel', cat: 'Metal', gen: 'metal', a: '#b0b0b8', rough: 0.2, metal: 1 },
  { name: 'Titanium', cat: 'Metal', gen: 'metal', a: '#8a8a92', rough: 0.4, metal: 1 },
  { name: 'Aluminum', cat: 'Metal', gen: 'metal', a: '#b8b8be', rough: 0.3, metal: 1 },
  { name: 'Chrome', cat: 'Metal', gen: 'metal', a: '#d0d4da', rough: 0.05, metal: 1 },
  { name: 'Platinum', cat: 'Metal', gen: 'metal', a: '#c8c8cc', rough: 0.15, metal: 1 },
  { name: 'Rusted Metal', cat: 'Metal', gen: 'metalworn', a: '#6a4a30', b: '#8a3a1a', rough: 0.8, metal: 1 },
  { name: 'Brushed Metal', cat: 'Metal', gen: 'metal', a: '#aaaab0', rough: 0.4, metal: 1, scale: 2 },
  { name: 'Polished Metal', cat: 'Metal', gen: 'metal', a: '#c0c0c8', rough: 0.05, metal: 1 },
  { name: 'Hammered Metal', cat: 'Metal', gen: 'metalworn', a: '#9a9aa0', b: '#7a7a80', rough: 0.5, metal: 1 },
  { name: 'Worn Metal', cat: 'Metal', gen: 'metalworn', a: '#8a8a90', b: '#5a4a3a', rough: 0.6, metal: 1 },
  { name: 'Oxidized Copper', cat: 'Metal', gen: 'metalworn', a: '#b87333', b: '#3aa890', rough: 0.6, metal: 1 },
  { name: 'Galvanized Steel', cat: 'Metal', gen: 'metalworn', a: '#b0b4ba', b: '#8a8a92', rough: 0.5, metal: 1 },
  { name: 'Anodized Aluminum', cat: 'Metal', gen: 'metal', a: '#4a6ac0', rough: 0.25, metal: 1 },

  // ───────── Glass ─────────
  { name: 'Clear Glass', cat: 'Glass', gen: 'glass', a: '#cfe8f0', rough: 0.02 },
  { name: 'Frosted Glass', cat: 'Glass', gen: 'glass', a: '#d0e0e8', rough: 0.5 },
  { name: 'Etched Glass', cat: 'Glass', gen: 'glass', a: '#d8e4ea', rough: 0.4, scale: 2 },
  { name: 'Patterned Glass', cat: 'Glass', gen: 'glass', a: '#cfe4ee', rough: 0.2, scale: 3 },
  { name: 'Ripple Glass', cat: 'Glass', gen: 'glass', a: '#c0e0ee', rough: 0.15, scale: 4 },
  { name: 'Rain Glass', cat: 'Glass', gen: 'glass', a: '#b8d8e8', rough: 0.2, scale: 5 },
  { name: 'Bubble Glass', cat: 'Glass', gen: 'glass', a: '#cfe8f0', rough: 0.1, scale: 6 },
  { name: 'Stained Glass', cat: 'Glass', gen: 'holo', a: '#8020a0', b: '#20a0c0', rough: 0.1 },
  { name: 'Colored Glass', cat: 'Glass', gen: 'glass', a: '#2aa0d0', rough: 0.05 },
  { name: 'Crystal Glass', cat: 'Glass', gen: 'glass', a: '#e0f0ff', rough: 0.02 },
  { name: 'Beveled Glass', cat: 'Glass', gen: 'glass', a: '#d0eaf4', rough: 0.05, scale: 2 },
  { name: 'Dirty Glass', cat: 'Glass', gen: 'glass', a: '#a8b8b0', rough: 0.4 },
  { name: 'Smoked Glass', cat: 'Glass', gen: 'glass', a: '#404048', rough: 0.1 },
  { name: 'Tinted Glass', cat: 'Glass', gen: 'glass', a: '#305a4a', rough: 0.05 },
  { name: 'Ice Glass', cat: 'Glass', gen: 'ice', a: '#c0e0f0', b: '#ffffff', rough: 0.1 },
  { name: 'Cracked Glass', cat: 'Glass', gen: 'ice', a: '#d0e8f4', b: '#ffffff', rough: 0.1, scale: 2.5 },
  { name: 'Prism Glass', cat: 'Glass', gen: 'holo', a: '#ff2080', b: '#20a0ff', rough: 0.05 },
  { name: 'Liquid Glass', cat: 'Glass', gen: 'glass', a: '#bfe0ee', rough: 0.03 },
  { name: 'Holographic Glass', cat: 'Glass', gen: 'holo', a: '#20ffa0', b: '#a020ff', rough: 0.05 },
  { name: 'Smart Glass', cat: 'Glass', gen: 'glass', a: '#708090', rough: 0.1 },

  // ───────── Brick & Wall ─────────
  { name: 'Red Brick', cat: 'Brick & Wall', gen: 'brick', a: '#9a3a2a', b: '#d8d0c0', rough: 0.9 },
  { name: 'Old Brick', cat: 'Brick & Wall', gen: 'brick', a: '#7a3a2a', b: '#b0a890', rough: 0.95 },
  { name: 'White Brick', cat: 'Brick & Wall', gen: 'brick', a: '#d8d4cc', b: '#e8e4dc', rough: 0.85 },
  { name: 'Stone Brick', cat: 'Brick & Wall', gen: 'brick', a: '#8a8a80', b: '#b0b0a8', rough: 0.9 },
  { name: 'Concrete Block', cat: 'Brick & Wall', gen: 'stone', a: '#9a9a96', b: '#7a7a76', rough: 0.85 },
  { name: 'Cement Wall', cat: 'Brick & Wall', gen: 'stone', a: '#a8a8a4', b: '#888884', rough: 0.8 },
  { name: 'Plaster Wall', cat: 'Brick & Wall', gen: 'stone', a: '#d8d4cc', b: '#c0bcb4', rough: 0.7 },
  { name: 'Stucco', cat: 'Brick & Wall', gen: 'stone', a: '#cfc8b8', b: '#b8b0a0', rough: 0.85, scale: 2 },
  { name: 'Painted Wall', cat: 'Brick & Wall', gen: 'stone', a: '#c0d0d8', b: '#b0c0c8', rough: 0.6 },
  { name: 'Rustic Wall', cat: 'Brick & Wall', gen: 'stone', a: '#8a7a5a', b: '#6a5a3a', rough: 0.9 },

  // ───────── Wood ─────────
  { name: 'Oak Wood', cat: 'Wood', gen: 'wood', a: '#a87840', b: '#8a5a2a', rough: 0.5 },
  { name: 'Pine Wood', cat: 'Wood', gen: 'wood', a: '#d8b878', b: '#b89858', rough: 0.5 },
  { name: 'Walnut Wood', cat: 'Wood', gen: 'wood', a: '#5a3a20', b: '#3a2414', rough: 0.45 },
  { name: 'Mahogany', cat: 'Wood', gen: 'wood', a: '#6a2a1a', b: '#4a1a10', rough: 0.35 },
  { name: 'Birch Wood', cat: 'Wood', gen: 'wood', a: '#d8c8a8', b: '#b8a888', rough: 0.5 },
  { name: 'Cedar Wood', cat: 'Wood', gen: 'wood', a: '#a85a3a', b: '#8a4428', rough: 0.55 },
  { name: 'Bamboo', cat: 'Wood', gen: 'wood', a: '#c8b860', b: '#a89840', rough: 0.5, scale: 1.5 },
  { name: 'Ebony', cat: 'Wood', gen: 'wood', a: '#2a2420', b: '#15110d', rough: 0.3 },
  { name: 'Rosewood', cat: 'Wood', gen: 'wood', a: '#6a3a2a', b: '#4a241a', rough: 0.4 },
  { name: 'Cherry Wood', cat: 'Wood', gen: 'wood', a: '#9a4a30', b: '#7a3420', rough: 0.4 },
  { name: 'Driftwood', cat: 'Wood', gen: 'wood', a: '#9a948a', b: '#7a746a', rough: 0.8 },
  { name: 'Burnt Wood', cat: 'Wood', gen: 'wood', a: '#2a2420', b: '#4a3a2a', rough: 0.7 },
  { name: 'Polished Wood', cat: 'Wood', gen: 'wood', a: '#8a5a30', b: '#6a3a1a', rough: 0.15 },
  { name: 'Rough Timber', cat: 'Wood', gen: 'wood', a: '#8a6a40', b: '#6a4a28', rough: 0.9 },
  { name: 'Wood Rings', cat: 'Wood', gen: 'wood', a: '#b8884a', b: '#8a5a2a', rough: 0.5, scale: 2 },
  { name: 'Wood Grain', cat: 'Wood', gen: 'wood', a: '#a87840', b: '#7a4a24', rough: 0.5, scale: 1.5 },
  { name: 'Weathered Wood', cat: 'Wood', gen: 'wood', a: '#9a948a', b: '#6a645a', rough: 0.85 },
  { name: 'Carved Wood', cat: 'Wood', gen: 'wood', a: '#8a5a34', b: '#5a3420', rough: 0.5 },
  { name: 'Plank Wood', cat: 'Wood', gen: 'planks', a: '#a87840', b: '#8a5a2a', rough: 0.5 },
  { name: 'Wooden Floor', cat: 'Wood', gen: 'planks', a: '#b8885a', b: '#8a5a30', rough: 0.3 },

  // ───────── Stone & Rock ─────────
  { name: 'Marble', cat: 'Stone', gen: 'marble', a: '#e8e4dc', b: '#888880', rough: 0.15 },
  { name: 'White Marble', cat: 'Stone', gen: 'marble', a: '#f0ece4', b: '#b0aca4', rough: 0.12 },
  { name: 'Black Marble', cat: 'Stone', gen: 'marble', a: '#1a1a20', b: '#5a5a60', rough: 0.15 },
  { name: 'Carrara Marble', cat: 'Stone', gen: 'marble', a: '#e4e8ea', b: '#8a9aa0', rough: 0.12 },
  { name: 'Granite', cat: 'Stone', gen: 'granite', a: '#8a8a86', b: '#4a4a48', rough: 0.4 },
  { name: 'Slate', cat: 'Stone', gen: 'stone', a: '#3a4248', b: '#2a3036', rough: 0.5 },
  { name: 'Limestone', cat: 'Stone', gen: 'stone', a: '#cfc8b0', b: '#b0a890', rough: 0.7 },
  { name: 'Sandstone', cat: 'Stone', gen: 'stone', a: '#c8a070', b: '#a88058', rough: 0.8 },
  { name: 'Basalt', cat: 'Stone', gen: 'stone', a: '#2a2a2e', b: '#1a1a1e', rough: 0.6 },
  { name: 'Quartz', cat: 'Stone', gen: 'granite', a: '#e0d8e0', b: '#c0b0c0', rough: 0.2 },
  { name: 'Obsidian', cat: 'Stone', gen: 'stone', a: '#14141a', b: '#2a2a34', rough: 0.1 },
  { name: 'Pebble Stone', cat: 'Stone', gen: 'gravel', a: '#9a948a', b: '#6a645a', rough: 0.7 },
  { name: 'River Rock', cat: 'Stone', gen: 'gravel', a: '#7a7a78', b: '#5a5a58', rough: 0.5 },
  { name: 'Mossy Stone', cat: 'Stone', gen: 'stone', a: '#5a6a4a', b: '#3a4a2a', rough: 0.8 },
  { name: 'Cliff Rock', cat: 'Stone', gen: 'stone', a: '#7a6a5a', b: '#5a4a3a', rough: 0.85, scale: 1.5 },
  { name: 'Cave Rock', cat: 'Stone', gen: 'stone', a: '#4a4440', b: '#2a2622', rough: 0.8 },
  { name: 'Cracked Stone', cat: 'Stone', gen: 'stone', a: '#8a847a', b: '#5a544a', rough: 0.8, scale: 2 },
  { name: 'Polished Stone', cat: 'Stone', gen: 'stone', a: '#6a6a70', b: '#4a4a50', rough: 0.1 },
  { name: 'Concrete', cat: 'Stone', gen: 'stone', a: '#9a9a96', b: '#7a7a76', rough: 0.8 },
  { name: 'Cement', cat: 'Stone', gen: 'stone', a: '#a8a8a4', b: '#888884', rough: 0.85 },
]

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildMaterial(p: Preset): ShaderDef {
  const a = c(p.a)
  const b: [number, number, number] = p.b ? c(p.b) : [a[0] * 0.6, a[1] * 0.6, a[2] * 0.6]
  const geom: GeometryKind = PLANE_GENS.has(p.gen) ? 'plane' : 'sphere'
  return {
    id: `mat-${slug(p.name)}`,
    name: p.name,
    category: p.cat,
    description: `${p.name} — procedural ${p.cat.toLowerCase()} material with editable colour, scale, roughness and metalness.`,
    complexity: 'Medium',
    performance: 3,
    kind: 'material',
    preferredGeometry: geom,
    material: `void material(vec2 uv, vec3 pos, vec3 nrm, out vec3 albedo, out float rough, out float metal){
  gen_${p.gen}(pos, albedo, rough, metal);
}`,
    uniforms: {
      uColorA: { type: 'color', label: 'Color A', value: a },
      uColorB: { type: 'color', label: 'Color B', value: b },
      uScale: { type: 'float', label: 'Scale', value: p.scale ?? 1, min: 0.2, max: 8, step: 0.05 },
      uRough: { type: 'float', label: 'Roughness', value: p.rough ?? 0.5, min: 0, max: 1, step: 0.01 },
      uMetal: { type: 'float', label: 'Metalness', value: p.metal ?? 0, min: 0, max: 1, step: 0.01 },
    },
  }
}

export const MATERIAL_SHADERS: ShaderDef[] = PRESETS.map(buildMaterial)
