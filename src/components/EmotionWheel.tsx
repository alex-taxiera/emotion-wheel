import {
  Fragment,
  useEffect,
  useImperativeHandle,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Box } from "@chakra-ui/react";
import { useColorMode } from "@/components/ui/color-mode";
import {
  annulusPath,
  buildWheelSegments,
  labelPlacement,
  RING_EDGES,
  segmentCenterSvgAngleDeg,
  type WheelColorMode,
  type WheelSegment,
} from "@/lib/emotionTree";
import {
  WHEEL_RADIUS,
  WHEEL_VIEWBOX_PAD,
  WHEEL_VIEWBOX_SIDE,
} from "@/lib/wheelSvgConstants";

const TRANSITION_MS = 4000;

/**
 * One continuous ease-out: starts briskly, slows smoothly to a stop (no second phase / constant-speed tail).
 * Quartic is a bit gentler than cubic; avoid very high powers—they flatten the tail so it looks “stuck”.
 */
const SPIN_EASE_OUT_POWER = 4;

function spinEasedProgress(linearT: number): number {
  const t = Math.min(1, Math.max(0, linearT));
  return 1 - (1 - t) ** SPIN_EASE_OUT_POWER;
}

/** Matches SVG `<text>`; keep in sync if you change wheel fonts. */
const WHEEL_LABEL_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

/**
 * One size for every label, scales with the smaller viewport axis (square wheel feels balanced).
 * Tweak clamp bounds to taste — all in CSS px on the rendered page.
 */
const WHEEL_LABEL_FONT_SIZE = "clamp(6px, 1vw, 7.5px)";

/** When another segment is selected, darken unselected wedges (opaque, not faded). */
const UNSELECTED_FILL_MIX_PCT = 62;

function ringRadii(depth: number): { inner: number; outer: number } {
  const edges = RING_EDGES;
  return {
    inner: edges[depth]! * WHEEL_RADIUS,
    outer: edges[depth + 1]! * WHEEL_RADIUS,
  };
}

const MAX_CHARS_BY_DEPTH = [22, 18, 16] as const;

function displayLabelForSegment(seg: WheelSegment): string {
  const maxC = MAX_CHARS_BY_DEPTH[seg.depth] ?? 16;
  return seg.label.length > maxC
    ? `${seg.label.slice(0, Math.max(4, maxC - 1))}…`
    : seg.label;
}

/** Where the fixed pointer sits: 180° = 9 o’clock (left); was −90° (top). */
const POINTER_TARGET_SVG_ANGLE_DEG = 180;

function nextSpinRotation(
  currentDeg: number,
  segmentSvgAngleDeg: number,
): number {
  const base = POINTER_TARGET_SVG_ANGLE_DEG - segmentSvgAngleDeg;
  const minEnd = currentDeg + 720;
  const k = Math.ceil((minEnd - base) / 360);
  return base + 360 * k;
}

export type EmotionWheelHandle = {
  spin: () => void;
};

type EmotionWheelProps = {
  selectedId: string | null;
  onSelect: (segment: WheelSegment) => void;
  ref: React.RefObject<EmotionWheelHandle | null>;
};

function clipPathId(prefix: string, segmentId: string): string {
  return `${prefix}-${segmentId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function gradientId(prefix: string, segmentId: string): string {
  return `${prefix}-${segmentId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/*
 * Wheel wedge gradients: **light** and **dark** are tuned independently below.
 *
 * Light: mix toward `WHEEL_GRADIENT_LIGHT_RIM` at the outer arc; dark: toward
 * `WHEEL_GRADIENT_DARK_RIM`. Per mode, edit rim, mid stop offset, mid bias, and the three outer
 * `baseFill` percentages in `wheelBandOuterColor*` (depth ≥2 / depth 1 / depth 0).
 *
 * Inner/outer continuity per mode: inner radius = previous ring’s outer color (same `baseFill`).
 */

// --- Light mode gradients ---
const WHEEL_GRADIENT_LIGHT_RIM = "#ffffff";
const WHEEL_GRADIENT_LIGHT_MID_STOP_OFFSET = 80;
const WHEEL_GRADIENT_LIGHT_MID_INNER_BIAS_PCT = 77;

function wheelBandOuterColorLight(depth: number, baseFill: string): string {
  if (depth >= 2) {
    return `color-mix(in hsl, ${baseFill} 60%, ${WHEEL_GRADIENT_LIGHT_RIM})`;
  }
  if (depth === 1) {
    return `color-mix(in hsl, ${baseFill} 85%, ${WHEEL_GRADIENT_LIGHT_RIM})`;
  }
  return `color-mix(in hsl, ${baseFill} 90%, ${WHEEL_GRADIENT_LIGHT_RIM})`;
}

function wheelBandInnerColorLight(depth: number, baseFill: string): string {
  if (depth <= 0) return baseFill;
  return wheelBandOuterColorLight(depth - 1, baseFill);
}

function wheelBandMidColorLight(depth: number, baseFill: string): string {
  const inner = wheelBandInnerColorLight(depth, baseFill);
  const outer = wheelBandOuterColorLight(depth, baseFill);
  return `color-mix(in hsl, ${inner} ${WHEEL_GRADIENT_LIGHT_MID_INNER_BIAS_PCT}%, ${outer})`;
}

// --- Dark mode gradients (defaults match light; change freely) ---
const WHEEL_GRADIENT_DARK_RIM = "#000000";
const WHEEL_GRADIENT_DARK_MID_STOP_OFFSET = 60;
const WHEEL_GRADIENT_DARK_MID_INNER_BIAS_PCT = 77;

function wheelBandOuterColorDark(depth: number, baseFill: string): string {
  if (depth >= 2) {
    return `color-mix(in hsl, ${baseFill} 80%, ${WHEEL_GRADIENT_DARK_RIM})`;
  }
  if (depth === 1) {
    return `color-mix(in hsl, ${baseFill} 90%, ${WHEEL_GRADIENT_DARK_RIM})`;
  }
  return `color-mix(in hsl, ${baseFill} 90%, ${WHEEL_GRADIENT_DARK_RIM})`;
}

function wheelBandInnerColorDark(depth: number, baseFill: string): string {
  if (depth <= 0) return baseFill;
  return wheelBandOuterColorDark(depth - 1, baseFill);
}

function wheelBandMidColorDark(depth: number, baseFill: string): string {
  const inner = wheelBandInnerColorDark(depth, baseFill);
  const outer = wheelBandOuterColorDark(depth, baseFill);
  return `color-mix(in hsl, ${inner} ${WHEEL_GRADIENT_DARK_MID_INNER_BIAS_PCT}%, ${outer})`;
}

type WheelGradientFns = {
  midStopOffset: number;
  inner: (depth: number, baseFill: string) => string;
  mid: (depth: number, baseFill: string) => string;
  outer: (depth: number, baseFill: string) => string;
};

function wheelGradientForMode(mode: WheelColorMode): WheelGradientFns {
  if (mode === "dark") {
    return {
      midStopOffset: WHEEL_GRADIENT_DARK_MID_STOP_OFFSET,
      inner: wheelBandInnerColorDark,
      mid: wheelBandMidColorDark,
      outer: wheelBandOuterColorDark,
    };
  }
  return {
    midStopOffset: WHEEL_GRADIENT_LIGHT_MID_STOP_OFFSET,
    inner: wheelBandInnerColorLight,
    mid: wheelBandMidColorLight,
    outer: wheelBandOuterColorLight,
  };
}

export function EmotionWheel({ selectedId, onSelect, ref }: EmotionWheelProps) {
  const { colorMode } = useColorMode();
  const wheelColorMode: WheelColorMode =
    colorMode === "dark" ? "dark" : "light";

  const uid = useId().replace(/:/g, "");
  const shadowId = `wheel-shadow-${uid}`;
  const clipPrefix = `wclip-${uid}`;
  const gradientPrefix = `wgrad-${uid}`;
  const segments = buildWheelSegments(wheelColorMode);
  const wheelGrad = wheelGradientForMode(wheelColorMode);
  const [rotationDeg, setRotationDeg] = useState(0);
  /** Smoothed angle for display; pivot is always user-space (0,0) via SVG transform. */
  const [displayRotation, setDisplayRotation] = useState(0);
  const displayRotationRef = useRef(0);
  const spinRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  function clearSpinReveal() {
    if (spinRevealTimeoutRef.current != null) {
      clearTimeout(spinRevealTimeoutRef.current);
      spinRevealTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    const from = displayRotationRef.current;
    const to = rotationDeg;
    if (Math.abs(to - from) < 1e-6) return;

    let rafId = 0;
    let cancelled = false;
    const startTime = performance.now();

    function tick(now: number) {
      if (cancelled) return;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / TRANSITION_MS);
      const frac = spinEasedProgress(t);
      const v = from + (to - from) * frac;
      displayRotationRef.current = v;
      setDisplayRotation(v);
      if (t < 1) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [rotationDeg]);

  useEffect(
    () => () => {
      if (spinRevealTimeoutRef.current != null) {
        clearTimeout(spinRevealTimeoutRef.current);
        spinRevealTimeoutRef.current = null;
      }
    },
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      spin: () => {
        if (segments.length === 0) return;
        const pick = segments[Math.floor(Math.random() * segments.length)]!;
        const A = segmentCenterSvgAngleDeg(pick.startT, pick.endT);
        clearSpinReveal();
        setRotationDeg((current) => nextSpinRotation(current, A));
        spinRevealTimeoutRef.current = setTimeout(() => {
          spinRevealTimeoutRef.current = null;
          onSelect(pick);
        }, TRANSITION_MS);
      },
    }),
    [onSelect, segments],
  );

  const handlePathClick = (e: MouseEvent, seg: WheelSegment) => {
    e.stopPropagation();
    clearSpinReveal();
    onSelect(seg);
  };

  return (
    <Box width="100%" aspectRatio={1} position="relative" color="inherit">
      <svg
        viewBox={`${-(WHEEL_RADIUS + WHEEL_VIEWBOX_PAD)} ${-(WHEEL_RADIUS + WHEEL_VIEWBOX_PAD)} ${WHEEL_VIEWBOX_SIDE} ${WHEEL_VIEWBOX_SIDE}`}
        width="100%"
        height="100%"
        display="block"
        overflow="visible"
        role="img"
        aria-label="Emotion wheel: click a segment or use Spin; the pick lands at the left pointer."
      >
        <defs>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" />
          </filter>
          {segments.map((seg) => {
            const { inner, outer } = ringRadii(seg.depth);
            const clipD = annulusPath(0, 0, inner, outer, seg.startT, seg.endT);
            const tMid = (seg.startT + seg.endT) / 2;
            const x1 = inner * Math.sin(tMid);
            const y1 = -inner * Math.cos(tMid);
            const x2 = outer * Math.sin(tMid);
            const y2 = -outer * Math.cos(tMid);
            const selected = seg.id === selectedId;
            const baseFill =
              selectedId && !selected
                ? `color-mix(in hsl, ${seg.color} ${UNSELECTED_FILL_MIX_PCT}%, black)`
                : seg.color;
            const gid = gradientId(gradientPrefix, seg.id);
            return (
              <Fragment key={`defs-${seg.id}`}>
                <clipPath
                  id={clipPathId(clipPrefix, seg.id)}
                  clipPathUnits="userSpaceOnUse"
                >
                  <path d={clipD} />
                </clipPath>
                <linearGradient
                  id={gid}
                  gradientUnits="userSpaceOnUse"
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                >
                  <stop
                    offset="0%"
                    stopColor={wheelGrad.inner(seg.depth, baseFill)}
                  />
                  <stop
                    offset={`${wheelGrad.midStopOffset}%`}
                    stopColor={wheelGrad.mid(seg.depth, baseFill)}
                  />
                  <stop
                    offset="100%"
                    stopColor={wheelGrad.outer(seg.depth, baseFill)}
                  />
                </linearGradient>
              </Fragment>
            );
          })}
        </defs>

        {/*
          Shadow on a static annulus so drop offset stays world-fixed while the wheel spins.
          Same inner/outer radii as segments; fully covered by the rotating layer (center hole stays clear).
        */}
        <path
          d={annulusPath(
            0,
            0,
            RING_EDGES[0]! * WHEEL_RADIUS,
            RING_EDGES[RING_EDGES.length - 1]! * WHEEL_RADIUS,
            0,
            2 * Math.PI,
          )}
          fill="#000"
          filter={`url(#${shadowId})`}
          style={{ pointerEvents: "none" }}
        />

        {/* Pointer at left (fixed); spin rotation aligns segment center here */}
        <polygon
          points={`${-(WHEEL_RADIUS + 6)},0 ${-WHEEL_RADIUS + 10},-10 ${-WHEEL_RADIUS + 10},10`}
          fill="currentColor"
          style={{ pointerEvents: "none" }}
        />

        <g transform={`rotate(${displayRotation} 0 0)`}>
          {segments.map((seg) => {
            const { inner, outer } = ringRadii(seg.depth);
            const d = annulusPath(0, 0, inner, outer, seg.startT, seg.endT);
            const selected = seg.id === selectedId;
            const { x, y, rotation } = labelPlacement(
              0,
              0,
              inner,
              outer,
              seg.startT,
              seg.endT,
            );
            const angularWidth = seg.endT - seg.startT;
            const displayLabel = displayLabelForSegment(seg);
            const showLabel = angularWidth > 0.03;

            const cid = clipPathId(clipPrefix, seg.id);
            const gid = gradientId(gradientPrefix, seg.id);

            return (
              <g key={seg.id} clipPath={`url(#${cid})`}>
                <path
                  d={d}
                  fill={`url(#${gid})`}
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={selected ? 2.5 : 0.9}
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
                      userSelect: "none",
                      fontSize: WHEEL_LABEL_FONT_SIZE,
                    }}
                  >
                    {displayLabel}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </Box>
  );
}
