// material-ui
import { useTheme } from '@mui/material/styles';

import logo from 'assets/images/secondLogo.png';
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
      <img src={logo} alt="Vina" width="50" />
    </>
  );
};

export default Logo;