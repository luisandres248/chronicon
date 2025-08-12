import React from 'react';
import { useTheme } from '@mui/material/styles';

const Logo = () => {
  const theme = useTheme();

  const styles = {
    word: {
      fill: theme.palette.text.primary,
      letterSpacing: '0.16em',
      fontWeight: 600,
      fontFamily: '"Cinzel", "Cormorant SC", "Trajan Pro", serif',
    },
    titulus: {
      fill: 'none',
      stroke: theme.palette.secondary.main,
      strokeWidth: 10,
      strokeLinecap: 'round',
    },
    end: {
      fill: theme.palette.secondary.main,
    },
  };

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 300" role="img" aria-label="· CHRONICON · wordmark">
      <text style={styles.word} x="600" y="190" textAnchor="middle" fontSize="120">·CHRONICON·</text>
      <path style={styles.titulus} d="M180,60 C420,20 780,20 1020,60"/>
      <path style={styles.end} d="M160,60 l24,-12 v24 z"/>
      <path style={styles.end} d="M1040,60 l-24,-12 v24 z"/>
    </svg>
  );
};

export default Logo;