// material-ui
import { useTheme } from '@mui/material/styles';
import { Typography } from '@mui/material';

import logoRavinala from 'assets/images/logo.jpg';

/**
 * if you want to use image instead of <svg> uncomment following.
 *
 * import logoDark from 'assets/images/logo-dark.svg';
 * import logo from 'assets/images/logo.svg';
 *
 */

// ==============================|| LOGO SVG ||============================== //

const Logo = () => {
  const theme = useTheme();

  return (
    <>
      <img src={logoRavinala} alt="Vina" width="80" />
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          fontSize: '15px',
          marginLeft: '12px',
          color: theme.palette.primary.main,
          letterSpacing: '0.5px',
          textDecoration: 'none',
          display: 'inline'
        }}
      >
        Vina
      </Typography>
    </>
  );
};

export default Logo;