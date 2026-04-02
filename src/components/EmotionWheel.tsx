import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { Box } from '@chakra-ui/react'
import { useColorMode } from '@/components/ui/color-mode'
import {
  annulusPath,
  buildWheelSegments,
  labelPlacement,
  RING_EDGES,
  segmentCenterSvgAngleDeg,
  type WheelColorMode,
  type WheelSegment,
} from '@/lib/emotionTree'
import {
  WHEEL_RADIUS,
  WHEEL_VIEWBOX_PAD,
  WHEEL_VIEWBOX_SIDE,
} from '@/lib/wheelSvgConstants'

const TRANSITION_MS = 2800

/** Matches SVG `<text>`; keep in sync if you change wheel fonts. */
const WHEEL_LABEL_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

/**
 * One size for every label, scales with the smaller viewport axis (square wheel feels balanced).
 * Tweak clamp bounds to taste — all in CSS px on the rendered page.
 */
const WHEEL_LABEL_FONT_SIZE = 'clamp(6px, 1vw, 8px)'

function ringRadii(depth: number): { inner: number; outer: number } {
  const edges = RING_EDGES
  return {
    inner: edges[depth]! * WHEEL_RADIUS,
    outer: edges[depth + 1]! * WHEEL_RADIUS,
  }
}

const MAX_CHARS_BY_DEPTH = [22, 18, 16] as const

function displayLabelForSegment(seg: WheelSegment): string {
  const maxC = MAX_CHARS_BY_DEPTH[seg.depth] ?? 16
  return seg.label.length > maxC
    ? `${seg.label.slice(0, Math.max(4, maxC - 1))}…`
    : seg.label
}

function nextSpinRotation(currentDeg: number, segmentSvgAngleDeg: number): number {
  const base = -90 - segmentSvgAngleDeg
  const minEnd = currentDeg + 720
  const k = Math.ceil((minEnd - base) / 360)
  return base + 360 * k
}

export type EmotionWheelHandle = {
  spin: () => void
}

type EmotionWheelProps = {
  selectedId: string | null
  onSelect: (segment: WheelSegment) => void
}

function clipPathId(prefix: string, segmentId: string): string {
  return `${prefix}-${segmentId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export const EmotionWheel = forwardRef<EmotionWheelHandle, EmotionWheelProps>(
  function EmotionWheel({ selectedId, onSelect }, ref) {
    const { colorMode } = useColorMode()
    const wheelColorMode: WheelColorMode =
      colorMode === 'dark' ? 'dark' : 'light'

    const uid = useId().replace(/:/g, '')
    const shadowId = `wheel-shadow-${uid}`
    const clipPrefix = `wclip-${uid}`
    const segments = useMemo(
      () => buildWheelSegments(wheelColorMode),
      [wheelColorMode],
    )
    const [rotationDeg, setRotationDeg] = useState(0)
    /** Smoothed angle for display; pivot is always user-space (0,0) via SVG transform. */
    const [displayRotation, setDisplayRotation] = useState(0)
    const displayRotationRef = useRef(0)
    const spinRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    )

    const clearSpinReveal = useCallback(() => {
      if (spinRevealTimeoutRef.current != null) {
        clearTimeout(spinRevealTimeoutRef.current)
        spinRevealTimeoutRef.current = null
      }
    }, [])

    useEffect(() => {
      const from = displayRotationRef.current
      const to = rotationDeg
      if (Math.abs(to - from) < 1e-6) return

      let rafId = 0
      let cancelled = false
      const startTime = performance.now()

      function tick(now: number) {
        if (cancelled) return
        const t = Math.min(1, (now - startTime) / TRANSITION_MS)
        const eased = 1 - (1 - t) ** 3
        const v = from + (to - from) * eased
        displayRotationRef.current = v
        setDisplayRotation(v)
        if (t < 1) rafId = requestAnimationFrame(tick)
      }

      rafId = requestAnimationFrame(tick)
      return () => {
        cancelled = true
        cancelAnimationFrame(rafId)
      }
    }, [rotationDeg])

    useEffect(() => () => clearSpinReveal(), [clearSpinReveal])

    const spin = useCallback(() => {
      if (segments.length === 0) return
      const pick = segments[Math.floor(Math.random() * segments.length)]!
      const A = segmentCenterSvgAngleDeg(pick.startT, pick.endT)
      clearSpinReveal()
      setRotationDeg((current) => nextSpinRotation(current, A))
      spinRevealTimeoutRef.current = setTimeout(() => {
        spinRevealTimeoutRef.current = null
        onSelect(pick)
      }, TRANSITION_MS)
    }, [segments, onSelect, clearSpinReveal])

    useImperativeHandle(ref, () => ({ spin }), [spin])

    const handlePathClick = useCallback(
      (e: MouseEvent, seg: WheelSegment) => {
        e.stopPropagation()
        clearSpinReveal()
        onSelect(seg)
      },
      [onSelect, clearSpinReveal],
    )

    return (
      <Box
        width="100%"
        aspectRatio={1}
        position="relative"
        color="inherit"
      >
        <svg
          viewBox={`${-(WHEEL_RADIUS + WHEEL_VIEWBOX_PAD)} ${-(WHEEL_RADIUS + WHEEL_VIEWBOX_PAD)} ${WHEEL_VIEWBOX_SIDE} ${WHEEL_VIEWBOX_SIDE}`}
          width="100%"
          height="100%"
          display="block"
          overflow="visible"
          role="img"
          aria-label="Emotion wheel: click a segment or use Spin to pick at random."
        >
        <defs>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodOpacity="0.25"
            />
          </filter>
          {segments.map((seg) => {
            const { inner, outer } = ringRadii(seg.depth)
            const clipD = annulusPath(0, 0, inner, outer, seg.startT, seg.endT)
            return (
              <clipPath
                key={`clip-${seg.id}`}
                id={clipPathId(clipPrefix, seg.id)}
                clipPathUnits="userSpaceOnUse"
              >
                <path d={clipD} />
              </clipPath>
            )
          })}
        </defs>

        {/* Pointer at top (fixed) */}
        <polygon
          points={`0,${-(WHEEL_RADIUS + 6)} -10,${-WHEEL_RADIUS + 10} 10,${-WHEEL_RADIUS + 10}`}
          fill="currentColor"
          style={{ pointerEvents: 'none' }}
        />

        <g
          transform={`rotate(${displayRotation} 0 0)`}
          filter={`url(#${shadowId})`}
        >
          {segments.map((seg) => {
            const { inner, outer } = ringRadii(seg.depth)
            const d = annulusPath(0, 0, inner, outer, seg.startT, seg.endT)
            const selected = seg.id === selectedId
            const { x, y, rotation } = labelPlacement(
              0,
              0,
              inner,
              outer,
              seg.startT,
              seg.endT,
            )
            const angularWidth = seg.endT - seg.startT
            const displayLabel = displayLabelForSegment(seg)
            const showLabel = angularWidth > 0.03

            const cid = clipPathId(clipPrefix, seg.id)

            return (
              <g key={seg.id} clipPath={`url(#${cid})`}>
                <path
                  d={d}
                  fill={seg.color}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={selected ? 2.5 : 0.9}
                  opacity={selected ? 1 : selectedId ? 0.72 : 1}
                  cursor="pointer"
                  onClick={(e) => handlePathClick(e, seg)}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={y}
                    fill="currentColor"
                    opacity={0.92}
                    fontWeight="600"
                    fontFamily={WHEEL_LABEL_FONT_FAMILY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${rotation} ${x} ${y})`}
                    pointerEvents="none"
                    style={{
                      userSelect: 'none',
                      fontSize: WHEEL_LABEL_FONT_SIZE,
                    }}
                  >
                    {displayLabel}
                  </text>
                )}
              </g>
            )
          })}
        </g>
        </svg>
      </Box>
    )
  },
)
