import React from 'react';
import { useTheme } from '@mui/material/styles';

const SmallLogo = ({ width = 88.783859 }) => {
  const vbW = 88.783859;
  const vbH = 66.083984;
  const height = (width * vbH) / vbW;
  const theme = useTheme();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${vbW} ${vbH}`}
      role="img"
      aria-label="· C · monograma con arco"
      width={width}
      height={height}
    >
      <defs>
        <marker
          style={{ overflow: 'visible' }}
          id="marker1956"
          refX="0"
          refY="0"
          orient="auto-start-reverse"
          markerWidth="2.729075"
          markerHeight="3.155"
          viewBox="0 0 5.3244081 6.1553851"
          preserveAspectRatio="xMidYMid"
        >
          <path
            transform="scale(0.5)"
            style={{
              fill: 'context-stroke',
              fillRule: 'evenodd',
              stroke: 'context-stroke',
              strokeWidth: '1pt',
            }}
            d="M 5.77,0 -2.88,5 V -5 Z"
          />
        </marker>

        <marker
          style={{ overflow: 'visible' }}
          id="TriangleStart"
          refX="0"
          refY="0"
          orient="auto-start-reverse"
          markerWidth="2.729075"
          markerHeight="3.155"
          viewBox="0 0 5.3244081 6.1553851"
          preserveAspectRatio="xMidYMid"
        >
          <path
            transform="scale(0.5)"
            style={{
              fill: 'context-stroke',
              fillRule: 'evenodd',
              stroke: 'context-stroke',
              strokeWidth: '1pt',
            }}
            d="M 5.77,0 -2.88,5 V -5 Z"
          />
        </marker>

        <style>{`
          .line { stroke:${theme.palette.secondary.main}; fill:none; stroke-width:3; stroke-linecap:round; }
          .dot  { fill:${theme.palette.secondary.main}; }
          .txt  { fill:${theme.palette.text.primary}; font:600 48px "Cinzel","Cormorant SC","Trajan Pro",serif; }
        `}</style>
      </defs>

      <path
        className="line"
        d="m 4.2185273,9.6140134 q 40.1734017,-16.738918 80.3468017,0"
        markerStart="url(#TriangleStart)"
        markerEnd="url(#marker1956)"
        style={{ strokeWidth: 2.51084, strokeDasharray: 'none' }}
      />

      <circle className="dot" cx="6.3919291" cy="38.681309" r="3.2" />
      <circle className="dot" cx="82.39193"  cy="38.681309" r="3.2" />

      <text
        className="txt"
        x="43.533276"
        y="61"
        textAnchor="middle"
        dominantBaseline="alphabetic"
        fill={theme.palette.text.primary}
        fontFamily={`Cinzel, 'Cormorant SC', 'Trajan Pro', serif`}
        fontWeight={600}
        fontSize="54"
      >
        <tspan
          style={{
            fontWeight: 'bold',
            fontSize: '64px',
            fontFamily: "Cinzel, 'Cormorant SC', 'Trajan Pro', serif",
          }}
        >
          C
        </tspan>
      </text>
    </svg>
  );
};

export default SmallLogo;
