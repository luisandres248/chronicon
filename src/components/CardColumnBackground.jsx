import React, { useId, useMemo } from "react";

const DEFAULT_ACCENT = "#6592c8";
const VIEWBOX_WIDTH = 372;
const VIEWBOX_HEIGHT = 150;
const FLUTE_WIDTHS = [14, 16, 17, 19, 21, 23, 25, 28, 40, 28, 25, 23, 21, 19, 17, 16, 14];

const DEFAULT_SETTINGS = {
  lightFluteOpacityTop: 0.42,
  lightFluteOpacityBottom: 0.24,
  shadowOpacity: 0.16,
  topCapRadius: 26,
  bottomCapRadius: 26,
  fluteRadius: 16,
  fluteShadowInset: 4,
  fluteShadowWidthMin: 1.35,
  fluteShadowWidthMax: 2,
  edgeInsetRatio: 0.1,
  minFluteGap: 0.75,
  maxFluteGap: 5.6,
  edgeFluteWidthRatio: 0.25,
  bleedY: 10,
};

function buildCenterProfile(index, count) {
  if (count <= 1) {
    return 1;
  }

  const position = index / (count - 1);
  const raw = 1 - Math.abs(position * 2 - 1);
  return Math.max(0, Math.min(1, raw));
}

function buildFlutes({
  width,
  minFluteGap,
  maxFluteGap,
  edgeFluteWidthRatio,
}) {
  const gapCount = FLUTE_WIDTHS.length - 1;
  const gaps = Array.from({ length: gapCount }, (_, index) => {
    const profile = buildCenterProfile(index + 0.5, gapCount);
    return minFluteGap + (maxFluteGap - minFluteGap) * Math.pow(profile, 1.85);
  });
  const gapTotal = gaps.reduce((sum, gap) => sum + gap, 0);
  const widthWeights = FLUTE_WIDTHS.map((weight, index) => {
    const profile = buildCenterProfile(index, FLUTE_WIDTHS.length);
    const edgeWeight = edgeFluteWidthRatio + ((1 - edgeFluteWidthRatio) * Math.pow(profile, 1.25));
    return weight * (0.94 + (profile * 0.04)) * edgeWeight;
  });
  const widthTotal = widthWeights.reduce((sum, weight) => sum + weight, 0);
  const scale = Math.max(0.01, (width - gapTotal) / widthTotal);
  let x = 0;

  return widthWeights.map((weight, index) => {
    const fluteWidth = weight * scale;
    const flute = { x, width: fluteWidth };
    x += fluteWidth + (gaps[index] || 0);
    return flute;
  });
}

function hexToRgb(color) {
  if (typeof color !== "string") {
    return null;
  }

  const normalized = color.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function mixWithWhite(rgb, ratio) {
  return {
    r: Math.round(rgb.r + (255 - rgb.r) * ratio),
    g: Math.round(rgb.g + (255 - rgb.g) * ratio),
    b: Math.round(rgb.b + (255 - rgb.b) * ratio),
  };
}

function mixWithBlack(rgb, ratio) {
  return {
    r: Math.round(rgb.r * (1 - ratio)),
    g: Math.round(rgb.g * (1 - ratio)),
    b: Math.round(rgb.b * (1 - ratio)),
  };
}

function CardColumnBackground({
  variant = "middle",
  accentColor = DEFAULT_ACCENT,
  lightFluteOpacityTop = DEFAULT_SETTINGS.lightFluteOpacityTop,
  lightFluteOpacityBottom = DEFAULT_SETTINGS.lightFluteOpacityBottom,
  shadowOpacity = DEFAULT_SETTINGS.shadowOpacity,
  topCapRadius = DEFAULT_SETTINGS.topCapRadius,
  bottomCapRadius = DEFAULT_SETTINGS.bottomCapRadius,
  fluteRadius = DEFAULT_SETTINGS.fluteRadius,
  fluteShadowInset = DEFAULT_SETTINGS.fluteShadowInset,
  fluteShadowWidthMin = DEFAULT_SETTINGS.fluteShadowWidthMin,
  fluteShadowWidthMax = DEFAULT_SETTINGS.fluteShadowWidthMax,
  edgeInsetRatio = DEFAULT_SETTINGS.edgeInsetRatio,
  minFluteGap = DEFAULT_SETTINGS.minFluteGap,
  maxFluteGap = DEFAULT_SETTINGS.maxFluteGap,
  edgeFluteWidthRatio = DEFAULT_SETTINGS.edgeFluteWidthRatio,
  bleedY = DEFAULT_SETTINGS.bleedY,
}) {
  const gradientId = useId().replace(/:/g, "");
  const flutes = useMemo(() => buildFlutes({
    width: VIEWBOX_WIDTH,
    minFluteGap,
    maxFluteGap,
    edgeFluteWidthRatio,
  }), [edgeFluteWidthRatio, maxFluteGap, minFluteGap]);
  const palette = useMemo(() => {
    const baseRgb = hexToRgb(accentColor) || hexToRgb(DEFAULT_ACCENT);
    const lightRgb = mixWithWhite(baseRgb, 0.82);
    const shadowRgb = mixWithBlack(baseRgb, 0.06);

    return {
      lightTop: rgba(lightRgb, lightFluteOpacityTop),
      lightBottom: rgba(lightRgb, lightFluteOpacityBottom),
      shadow: rgba(shadowRgb, shadowOpacity),
    };
  }, [
    accentColor,
    lightFluteOpacityBottom,
    lightFluteOpacityTop,
    shadowOpacity,
  ]);
  const shadowWidths = useMemo(() => flutes.map((flute, index) => {
    const profile = buildCenterProfile(index, flutes.length);
    return fluteShadowWidthMin + ((fluteShadowWidthMax - fluteShadowWidthMin) * profile);
  }), [fluteShadowWidthMax, fluteShadowWidthMin, flutes]);

  const edgeInset = Math.round(VIEWBOX_HEIGHT * edgeInsetRatio);

  let fluteTop = -bleedY;
  let fluteBottom = VIEWBOX_HEIGHT + bleedY;

  if (variant === "first") {
    fluteTop = edgeInset;
    fluteBottom = VIEWBOX_HEIGHT + bleedY;
  } else if (variant === "last") {
    fluteTop = -bleedY;
    fluteBottom = VIEWBOX_HEIGHT - edgeInset;
  } else if (variant === "single") {
    fluteTop = edgeInset;
    fluteBottom = VIEWBOX_HEIGHT - edgeInset;
  }

  return (
    <div className="card-column-background" aria-hidden="true">
      <svg className="card-column-background__svg" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`column-flute-${gradientId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.lightTop} />
            <stop offset="100%" stopColor={palette.lightBottom} />
          </linearGradient>
        </defs>

        {flutes.map((flute, index) => (
          <React.Fragment key={`${variant}-${index}`}>
            <clipPath id={`column-flute-clip-${gradientId}-${index}`} clipPathUnits="userSpaceOnUse">
              <rect
                x={flute.x}
                y={fluteTop}
                width={flute.width}
                height={fluteBottom - fluteTop}
                rx={fluteRadius}
                ry={fluteRadius}
              />
            </clipPath>
            <g clipPath={`url(#column-flute-clip-${gradientId}-${index})`}>
              <rect
                x={flute.x}
                y={fluteTop}
                width={flute.width}
                height={fluteBottom - fluteTop}
                rx={fluteRadius}
                ry={fluteRadius}
                fill={`url(#column-flute-${gradientId})`}
              />
              <rect
                x={flute.x}
                y={fluteTop + fluteShadowInset}
                width={shadowWidths[index]}
                height={(fluteBottom - fluteTop) - fluteShadowInset * 2}
                fill={palette.shadow}
              />
            </g>
          </React.Fragment>
        ))}
      </svg>
    </div>
  );
}

export default CardColumnBackground;
