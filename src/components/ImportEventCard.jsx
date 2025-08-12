import React, { useContext } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { format } from 'date-fns';
import { RRule } from 'rrule';
import { useTranslation } from 'react-i18next';
import { GlobalContext } from '../context/GlobalContext';
import { formatDate } from '../utils/dateFormatter';

const getRecurrenceDescription = (rruleString, t) => {
  if (!rruleString) return t('singleEvent');
  try {
    // Capitalize the first letter of the translated text
    const text = RRule.fromString(rruleString).toText();
    return text.charAt(0).toUpperCase() + text.slice(1);
  } catch (e) {
    console.error('Error parsing RRULE string:', e);
    return t('complexRecurrence');
  }
};

const ImportEventCard = ({ eventGroup }) => {
  const { t, i18n } = useTranslation();
  const { calendarColors, config } = useContext(GlobalContext);

  const event = eventGroup[0]; // Use the first event in the group for display properties
  const { name, startDate, recurrence, colorId, description, tags } = event;

  const rruleString = recurrence && recurrence.length > 0 ? recurrence[0] : null;
  let recurrenceText;

  if (rruleString) {
    recurrenceText = getRecurrenceDescription(rruleString, t);
  } else if (eventGroup.length > 1) {
    recurrenceText = t('repeatsXTimes', { count: eventGroup.length });
  } else {
    recurrenceText = t('singleEvent');
  }

  const getEventColor = () => {
    if (!colorId || !calendarColors) return null;
    return calendarColors[colorId]?.background || null;
  };

  const isLightColor = (color) => {
    if (!color) return true;
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return true;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.5;
  };

  const backgroundColor = getEventColor();
  const isDarkMode = config?.darkMode;

  const lightModeTextColor = backgroundColor ? (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : 'rgba(0, 0, 0, 0.87)';
  const lightModeSecondaryTextColor = backgroundColor ? (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 'rgba(0, 0, 0, 0.6)';
  const darkModeTextColor = backgroundColor ? (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.87)' : '#ffffff') : '#ffffff';
  const darkModeSecondaryTextColor = backgroundColor ? (isLightColor(backgroundColor) ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)') : 'rgba(255, 255, 255, 0.7)';

  const textColor = isDarkMode ? darkModeTextColor : lightModeTextColor;
  const secondaryTextColor = isDarkMode ? darkModeSecondaryTextColor : lightModeSecondaryTextColor;
  const cardBackgroundColor = backgroundColor || (isDarkMode ? '#293548' : '#ffffff');

  const customFormatDate = (date) => {
    return formatDate(date, config.dateFormat, i18n.language);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        mb: 1,
        backgroundColor: cardBackgroundColor,
        color: textColor,
        borderLeft: `5px solid ${backgroundColor || 'transparent'}`,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {name}
        </Typography>
        <Typography variant="body2" color={secondaryTextColor} sx={{ mb: 1 }}>
          {t('firstOccurrence')}: {startDate ? customFormatDate(startDate) : 'N/A'}
        </Typography>

        {description && (
          <Typography
            variant="body2"
            color={secondaryTextColor}
            sx={{
              mb: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={recurrenceText}
            size="small"
            variant="outlined"
            sx={{ borderColor: secondaryTextColor, color: secondaryTextColor }}
          />
          {tags && tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                color: textColor,
              }}
            />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default ImportEventCard;
