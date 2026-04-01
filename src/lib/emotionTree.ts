import { emotions } from '@/emotions'

/** Raw node shape from `emotions.ts` (readonly-friendly for `as const` inference). */
export type EmotionNode = {
  readonly label: string
  readonly children?: readonly EmotionNode[]
}

/** One annulus sector on the wheel (every tree node is selectable). */
export type WheelSegment = {
  id: string
  path: string[]
  label: string
  depth: number
  /** Bearing from top, clockwise, radians in [0, 2π) */
  startT: number
  endT: number
  color: string
  primaryKey: string
}

/** Base hue per primary key — distinct families on the wheel. */
const PRIMARY_HUE: Record<string, number> = {
  HAPPY: 46,
  ANGER: 12,
  FEAR: 268,
  SAD: 210,
  DISGUST: 92,
  SURPRISE: 292,
}

/** Count of leaf nodes in `node`'s subtree (this node counts if it has no children). */
export function countLeaves(node: EmotionNode): number {
  if (!node.children?.length) return 1
  let sum = 0
  for (const c of node.children) sum += countLeaves(c)
  return sum
}

function segmentColor(
  primaryKey: string,
  depth: number,
  indexInParent: number,
  numSiblings: number,
): string {
  const base = PRIMARY_HUE[primaryKey] ?? 200
  const spread = numSiblings <= 1 ? 0 : (indexInParent - (numSiblings - 1) / 2) * 7
  const h = (base + spread + 360) % 360
  const s = Math.max(36, 74 - depth * 14)
  const l = Math.min(64, 40 + depth * 9 + indexInParent * 1.5)
  return `hsl(${h} ${s}% ${l}%)`
}

function walk(
  node: EmotionNode,
  primaryKey: string,
  t0: number,
  t1: number,
  depth: number,
  pathPrefix: string[],
  siblingIndex: number,
  siblingCount: number,
  out: WheelSegment[],
): void {
  const path = [...pathPrefix, node.label]
  out.push({
    id: path.join('/'),
    path,
    label: node.label,
    depth,
    startT: t0,
    endT: t1,
    color: segmentColor(primaryKey, depth, siblingIndex, siblingCount),
    primaryKey,
  })

  if (!node.children?.length) return

  const n = node.children.length
  const childWeights = node.children.map((c) => countLeaves(c))
  const weightSum = childWeights.reduce((a, b) => a + b, 0)
  if (weightSum <= 0) return

  const span = t1 - t0
  let acc = t0
  for (let i = 0; i < n; i++) {
    const child = node.children[i]!
    const w = childWeights[i]! / weightSum
    const ct1 = acc + span * w
    walk(child, primaryKey, acc, ct1, depth + 1, path, i, n, out)
    acc = ct1
  }
}

/** Ring boundaries: inner hole, then outer edge of depth 0, 1, 2 (normalized 0–1, multiply by radius). */
export const RING_EDGES = [0.14, 0.38, 0.68, 1] as const

export function buildWheelSegments(): WheelSegment[] {
  const segments: WheelSegment[] = []
  const roots = Object.entries(emotions) as [string, EmotionNode][]
  const count = roots.length
  const full = Math.PI * 2
  const rootWeights = roots.map(([, node]) => countLeaves(node))
  const totalLeaves = rootWeights.reduce((a, b) => a + b, 0)
  if (totalLeaves <= 0) return segments

  let acc = 0
  for (let i = 0; i < count; i++) {
    const [key, node] = roots[i]!
    const t1 = acc + (full * rootWeights[i]!) / totalLeaves
    walk(node, key, acc, t1, 0, [], i, count, segments)
    acc = t1
  }
  return segments
}

/**
 * Annulus sector as a closed polygon (outer arc → inner arc). Avoids SVG elliptical-arc
 * sweep/large-arc ambiguity that can trace the major arc and make every wedge cover the disk.
 * `t` is bearing from top, clockwise (rad); y-axis points down (SVG).
 */
export function annulusPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  t0: number,
  t1: number,
  arcSteps = 48,
): string {
  const p = (r: number, t: number) => ({
    x: cx + r * Math.sin(t),
    y: cy - r * Math.cos(t),
  })
  const delta = t1 - t0
  const n = Math.max(
    2,
    Math.min(
      arcSteps,
      Math.ceil((Math.abs(delta) / Math.PI) * 22) + 2,
    ),
  )
  const parts: string[] = []
  for (let i = 0; i <= n; i++) {
    const t = t0 + (delta * i) / n
    const { x, y } = p(rOuter, t)
    parts.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)
  }
  for (let i = n; i >= 0; i--) {
    const t = t0 + (delta * i) / n
    const { x, y } = p(rInner, t)
    parts.push(`L ${x} ${y}`)
  }
  parts.push('Z')
  return parts.join(' ')
}

/**
 * Mid-radius label anchor with rotation **tangential** to the ring (minimal radial footprint).
 * Tangent direction matches increasing `t` (clockwise from top); flip 180° on the lower half
 * so type stays readable left-to-right.
 */
export function labelPlacement(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  t0: number,
  t1: number,
): { x: number; y: number; rotation: number } {
  const tMid = (t0 + t1) / 2
  const rMid = (rInner + rOuter) / 2
  const x = cx + rMid * Math.sin(tMid)
  const y = cy - rMid * Math.cos(tMid)
  let rotation = (tMid * 180) / Math.PI
  if (rotation > 90 && rotation < 270) rotation += 180
  return { x, y, rotation }
}

/**
 * Local SVG angle in degrees (0° = 3 o'clock, 90° = 6 o'clock, -90° = 12 o'clock)
 * for the center of a segment; used with `rotate(deg)` so the top pointer hits `tMid`.
 */
export function segmentCenterSvgAngleDeg(startT: number, endT: number): number {
  const tMid = (startT + endT) / 2
  return -90 + (tMid * 180) / Math.PI
}
