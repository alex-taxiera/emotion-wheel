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

export type WheelColorMode = 'light' | 'dark'

/** Base fill per root family — light theme (wheel on pale UI). */
export const PRIMARY_FAMILY_FILL_LIGHT: Record<string, string> = {
  HAPPY: 'hsl(46 78% 58%)',
  ANGER: 'hsl(10 82% 54%)',
  FEAR: 'hsl(268 58% 62%)',
  SAD: 'hsl(214 62% 56%)',
  DISGUST: 'hsl(96 52% 44%)',
  SURPRISE: 'hsl(292 65% 64%)',
}

/** Same families tuned for dark UI (slightly richer / balanced on dark gray). */
export const PRIMARY_FAMILY_FILL_DARK: Record<string, string> = {
  HAPPY: 'hsl(44 72% 48%)',
  ANGER: 'hsl(8 78% 52%)',
  FEAR: 'hsl(270 62% 62%)',
  SAD: 'hsl(212 58% 58%)',
  DISGUST: 'hsl(94 48% 46%)',
  SURPRISE: 'hsl(290 68% 62%)',
}

const FALLBACK_FAMILY_FILL_LIGHT = 'hsl(215 38% 58%)'
const FALLBACK_FAMILY_FILL_DARK = 'hsl(215 45% 52%)'

function paletteForMode(mode: WheelColorMode): Record<string, string> {
  return mode === 'dark' ? PRIMARY_FAMILY_FILL_DARK : PRIMARY_FAMILY_FILL_LIGHT
}

function fallbackForMode(mode: WheelColorMode): string {
  return mode === 'dark' ? FALLBACK_FAMILY_FILL_DARK : FALLBACK_FAMILY_FILL_LIGHT
}

function fillForPrimary(primaryKey: string, mode: WheelColorMode): string {
  const palette = paletteForMode(mode)
  return palette[primaryKey] ?? fallbackForMode(mode)
}

/** Count of leaf nodes in `node`'s subtree (this node counts if it has no children). */
export function countLeaves(node: EmotionNode): number {
  if (!node.children?.length) return 1
  let sum = 0
  for (const c of node.children) sum += countLeaves(c)
  return sum
}

function walk(
  node: EmotionNode,
  primaryKey: string,
  t0: number,
  t1: number,
  depth: number,
  pathPrefix: string[],
  colorMode: WheelColorMode,
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
    color: fillForPrimary(primaryKey, colorMode),
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
    walk(child, primaryKey, acc, ct1, depth + 1, path, colorMode, out)
    acc = ct1
  }
}

/**
 * Ring boundaries: inner hole, then outer edge of depth 0, 1, 2 (normalized 0–1 × radius).
 * Middle and outer bands are wider than the primary ring so radial (sideways) labels fit.
 */
export const RING_EDGES = [0.1, 0.33, 0.66, 1] as const

export function buildWheelSegments(
  colorMode: WheelColorMode = 'light',
): WheelSegment[] {
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
    walk(node, key, acc, t1, 0, [], colorMode, segments)
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
 * Some subtrees sit on the long arc clockwise from the wheel top (HAPPY, ANGER, then the first
 * FEAR branches). For those wedges, the generic (−90°, 90°] readability step picks the opposite
 * radial reading sense from the rest of the wheel; add 180° to the label rotation there.
 */
export function segmentNeedsLabelRotationFlip180(seg: WheelSegment): boolean {
  if (seg.primaryKey === 'HAPPY' || seg.primaryKey === 'ANGER') return true
  if (
    seg.primaryKey === 'FEAR' &&
    seg.path.length >= 2 &&
    (seg.path[1] === 'Humiliated' || seg.path[1] === 'Rejected')
  ) {
    return true
  }
  return false
}

/**
 * Mid-radius label anchor: baseline lies on the **outward radial** through `tMid`
 * (same frame as `annulusPath`: x = cx + r sin t, y = cy − r cos t).
 *
 * SVG `rotate(θ)` sends default baseline +x to (cos θ, sin θ) (θ in degrees, positive = clockwise).
 * We need that parallel to radial (sin t, −cos t), so θ = atan2(−cos t, sin t) before normalization.
 *
 * Then clamp to (−90°, 90°] like map labels so type stays readable (flip 180° along the radial when
 * needed). This replaces the old `bearing + cos flip + 90` heuristic, which disagreed with SVG’s
 * actual rotate convention on many wedges.
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

  let rotation =
    (Math.atan2(-Math.cos(tMid), Math.sin(tMid)) * 180) / Math.PI
  rotation = ((rotation + 180) % 360 + 360) % 360 - 180
  if (rotation > 90) rotation -= 180
  else if (rotation < -90) rotation += 180

  return { x, y, rotation }
}

/**
 * Local SVG angle in degrees (0° = 3 o'clock, 90° = 6 o'clock, -90° = 12 o'clock)
 * for the center of a segment; used with `rotate(deg)` so the left pointer (180°) hits `tMid`.
 */
export function segmentCenterSvgAngleDeg(startT: number, endT: number): number {
  const tMid = (startT + endT) / 2
  return -90 + (tMid * 180) / Math.PI
}
