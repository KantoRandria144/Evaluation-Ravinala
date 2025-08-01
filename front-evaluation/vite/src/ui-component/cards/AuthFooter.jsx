// material-ui
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import logoRavinala from 'assets/images/logo.jpg';

// ==============================|| FOOTER - AUTHENTICATION 2 & 3 ||============================== //

const AuthFooter = () => (
  <Stack direction="row" justifyContent="space-between">
    <Typography variant="subtitle2" component={Link} href="https://berrydashboard.io" target="_blank" underline="hover" sx={{ml:2}}>
      <img src={logoRavinala} alt="Vina" width="50" />
    </Typography>
    <Typography variant="subtitle2" component={Link} href="https://www.ravinala-airports.aero/en/" target="_blank" underline="hover" sx={{mt:2}}>
      &copy; Ravinala Airports
    </Typography>
  </Stack>
);

export default AuthFooter;
