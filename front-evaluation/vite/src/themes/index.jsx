import { createTheme } from '@mui/material/styles';

// assets
import colors from 'assets/scss/_themes-vars.module.scss';

// project imports
import componentStyleOverrides from './compStyleOverride';
import themePalette from './palette';
import themeTypography from './typography';

/**
 * Represent theme style and structure as per Material-UI
 * @param {JsonObject} customization customization parameter object
 */

export const theme = (customization) => {
  const color = {
    ...colors,
    background: '#EEF2F6',
    primaryLight: 'rgb(232, 234, 246)',  // bleu clair
    primaryMain: 'rgb(63, 81, 181)',   // bleu navy
    primaryDark: 'rgb(57, 73, 171)',   // bleu plus foncé
    secondaryLight: 'rgb(232, 234, 246)',  // bleu clair pour la secondaire
    secondaryMain: 'rgb(63, 81, 181)',   // bleu navy pour la secondaire
    secondaryDark: 'rgb(57, 73, 171)'    // bleu plus foncé pour la secondaire
  };

  const themeOption = {
    colors: color,
    heading: color.grey900,
    paper: color.paper,
    backgroundDefault: color.paper,
    background: color.background,
    darkTextPrimary: color.grey700,
    darkTextSecondary: color.grey500,
    textDark: color.grey900,
    menuSelected: color.secondaryDark,
    menuSelectedBack: color.secondaryLight,
    divider: color.grey200,
    customization
  };

  const themeOptions = {
    direction: 'ltr',
    palette: themePalette(themeOption),
    mixins: {
      toolbar: {
        minHeight: '48px',
        padding: '16px',
        '@media (min-width: 600px)': {
          minHeight: '48px'
        }
      }
    },
    typography: themeTypography(themeOption)
  };

  const themes = createTheme(themeOptions);
  themes.components = componentStyleOverrides(themeOption);

  return themes;
};

export default theme;
