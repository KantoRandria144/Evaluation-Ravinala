export default function themePalette(theme) {
  return {
    mode: theme?.customization?.navType,
    common: {
      black: theme.colors?.darkPaper
    },
    primary: {
      light: 'rgb(232, 234, 246)', // nuance plus claire de #153f8f
      main: 'rgb(63, 81, 181)',  // bleu principal
      dark: 'rgb(57, 73, 171)',  // nuance plus foncée de rgb(63, 81, 181)
      200: '#2e539b',   // variation pour l'intensité 200
      800: 'rgb(57, 73, 171)'    // variation pour l'intensité 800
    },
    secondary: {
      light: 'rgb(232, 234, 246)', // nuance plus claire de rgb(63, 81, 181)
      main: 'rgb(63, 81, 181)',  // bleu principal
      dark: 'rgb(57, 73, 171)',  // nuance plus foncée de rgb(63, 81, 181)
      200: '#2e539b',
      800: 'rgb(57, 73, 171)'
    },
    error: {
      light: theme.colors?.errorLight,
      main: theme.colors?.errorMain,
      dark: theme.colors?.errorDark
    },
    orange: {
      light: theme.colors?.orangeLight,
      main: theme.colors?.orangeMain,
      dark: theme.colors?.orangeDark
    },
    warning: {
      light: theme.colors?.warningLight,
      main: theme.colors?.warningMain,
      dark: theme.colors?.warningDark
    },
    success: {
      light: theme.colors?.successLight,
      200: theme.colors?.success200,
      main: theme.colors?.successMain,
      dark: theme.colors?.successDark
    },
    grey: {
      50: theme.colors?.grey50,
      100: theme.colors?.grey100,
      500: theme.darkTextSecondary,
      600: theme.heading,
      700: theme.darkTextPrimary,
      900: theme.textDark
    },
    dark: {
      light: theme.colors?.darkTextPrimary,
      main: theme.colors?.darkLevel1,
      dark: theme.colors?.darkLevel2,
      800: theme.colors?.darkBackground,
      900: theme.colors?.darkPaper
    },
    text: {
      primary: theme.darkTextPrimary,
      secondary: theme.darkTextSecondary,
      dark: theme.textDark,
      hint: theme.colors?.grey100
    },
    background: {
      paper: theme.paper,
      default: theme.backgroundDefault
    }
  };
}
