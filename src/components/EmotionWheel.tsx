import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useId,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { Box } from '@chakra-ui/react'
import {
  annulusPath,
  buildWheelSegments,
  labelPlacement,
  RING_EDGES,
  segmentCenterSvgAngleDeg,
  type WheelSegment,
} from '@/lib/emotionTree'

const WHEEL_RADIUS = 118
const TRANSITION_MS = 2800

function ringRadii(depth: number): { inner: number; outer: number } {
  const edges = RING_EDGES
  return {
    inner: edges[depth]! * WHEEL_RADIUS,
    outer: edges[depth + 1]! * WHEEL_RADIUS,
  }
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

export const EmotionWheel = forwardRef<EmotionWheelHandle, EmotionWheelProps>(
  function EmotionWheel({ selectedId, onSelect }, ref) {
    const shadowId = `wheel-shadow-${useId().replace(/:/g, '')}`
    const segments = useMemo(() => buildWheelSegments(), [])
    const [rotationDeg, setRotationDeg] = useState(0)

    const spin = useCallback(() => {
      if (segments.length === 0) return
      const pick = segments[Math.floor(Math.random() * segments.length)]!
      const A = segmentCenterSvgAngleDeg(pick.startT, pick.endT)
      setRotationDeg((current) => nextSpinRotation(current, A))
      onSelect(pick)
    }, [segments, onSelect])

    useImperativeHandle(ref, () => ({ spin }), [spin])

    const handlePathClick = useCallback(
      (e: MouseEvent, seg: WheelSegment) => {
        e.stopPropagation()
        onSelect(seg)
      },
      [onSelect],
    )

    const spinGroupStyle: CSSProperties = {
      transform: `rotate(${rotationDeg}deg)`,
      transformBox: 'view-box',
      transformOrigin: 'center center',
      transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`,
    }

    return (
      <Box
        w="min(96vw, 560px)"
        maxW="560px"
        aspectRatio={1}
        position="relative"
        color="inherit"
      >
        <svg
          viewBox={`${-WHEEL_RADIUS - 8} ${-WHEEL_RADIUS - 8} ${(WHEEL_RADIUS + 8) * 2} ${(WHEEL_RADIUS + 8) * 2}`}
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
        </defs>

        {/* Pointer at top (fixed) */}
        <polygon
          points={`0,${-WHEEL_RADIUS - 6} -10,${-WHEEL_RADIUS + 10} 10,${-WHEEL_RADIUS + 10}`}
          fill="currentColor"
          style={{ pointerEvents: 'none' }}
        />

        <g style={spinGroupStyle} filter={`url(#${shadowId})`}>
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
            const rMid = (inner + outer) / 2
            const arcLen = rMid * angularWidth
            const baseFont =
              seg.depth === 0 ? 12.5 : seg.depth === 1 ? 9.8 : 8.4
            const fontSize = Math.max(
              5.8,
              Math.min(
                baseFont,
                arcLen / Math.max(seg.label.length * 0.52, 2.4),
              ),
            )
            const showLabel = angularWidth > 0.038 && fontSize >= 5.8

            const displayLabel =
              seg.label.length > 18
                ? `${seg.label.slice(0, 16)}…`
                : seg.label

            return (
              <g key={seg.id}>
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
                    opacity={0.9}
                    fontSize={fontSize}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${rotation} ${x} ${y})`}
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}
                    {...(arcLen > 6
                      ? {
                          textLength: Math.min(
                            arcLen * 0.88,
                            displayLabel.length * fontSize * 0.65,
                          ),
                          lengthAdjust: 'spacingAndGlyphs' as const,
                        }
                      : {})}
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
