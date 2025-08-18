import { useState } from 'react';

// material-ui
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// third party
import { Formik } from 'formik';
import * as Yup from 'yup';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';

// assets
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

//lien
import { authInstance } from "axiosConfig";
import { useNavigate } from 'react-router-dom';

import AuditService from '../../../../services/AuditService';

// ============================|| FIREBASE - LOGIN ||============================ //

const AuthLogin = ({ ...others }) => {
  const theme = useTheme();
  const [checked, setChecked] = useState(true);
  const navigate = useNavigate();


  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSubmitLogin = async (values, { setErrors, setSubmitting }) => {
    try {
        const response = await authInstance.post('/Login', {
            username: values.matricule,
            password: values.password,
        });

      if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            await AuditService.logAction(
              response.data.user.id,
              'Authentification réussie',
              'Users',
              response.data.user.id
            );

            navigate('/dashboard/default');
            
        } else {
            setErrors({ submit: response.data.message });
        }
    } catch (error) {
        if (error.response && error.response.data) {
            const backendError = error.response.data;
            setErrors({ submit: backendError.message || 'Failed' });
        } else {
            setErrors({ submit: 'Failed' });
        }
    } finally {
        setSubmitting(false);
    }
};
  

  return (
    <>

      <Formik
        initialValues={{
          matricule: '',
          password: '',
          submit: null
        }}
        validationSchema={Yup.object().shape({
          matricule: Yup.string().required('Matricule est requis'),
          password: Yup.string().max(255).required('Password est requis')
        })}
        onSubmit={handleSubmitLogin}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
          <form noValidate onSubmit={handleSubmit} {...others}>
            <FormControl fullWidth error={Boolean(touched.matricule && errors.matricule)} sx={{ ...theme.typography.customInput }}>
              <InputLabel htmlFor="outlined-adornment-matricule-login">Matricule</InputLabel>
              <OutlinedInput
                id="outlined-adornment-matricule-login"
                type="text" 
                value={values.matricule}
                name="matricule"
                onBlur={handleBlur}
                onChange={handleChange}
                label="Matricule"
                inputProps={{}}
              />
              {touched.matricule && errors.matricule && (
                <FormHelperText error id="standard-weight-helper-text-matricule-login">
                  {errors.matricule}
                </FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(touched.password && errors.password)} sx={{ ...theme.typography.customInput }}>
              <InputLabel htmlFor="outlined-adornment-password-login">Mot de passe</InputLabel>
              <OutlinedInput
                id="outlined-adornment-password-login"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                name="password"
                onBlur={handleBlur}
                onChange={handleChange}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      size="large"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                }
                label="Password"
                inputProps={{}}
              />
              {touched.password && errors.password && (
                <FormHelperText error id="standard-weight-helper-text-password-login">
                  {errors.password}
                </FormHelperText>
              )}
            </FormControl>
            {errors.submit && (
              <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', color: 'error.main' }}>
                <ErrorOutlineIcon sx={{ mr: 1 }} />
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Box>
            )}

              <Box sx={{ mt: 2 }}>
                <AnimateButton>
                  <Button disableElevation disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained" color="secondary">
                    Valider
                  </Button>
                </AnimateButton>
              </Box>

              {/* <Divider sx={{ mt: 2, flexGrow: 2, mb:1 }} orientation="horizontal" />

            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
              <Typography variant="subtitle1" color="secondary" sx={{ textDecoration: 'none', cursor: 'pointer' }}>
                Mot de passe oublié ?
              </Typography>
            </Stack> */}
            
          </form>
        )}
      </Formik>
    </>
  );
};

export default AuthLogin;
