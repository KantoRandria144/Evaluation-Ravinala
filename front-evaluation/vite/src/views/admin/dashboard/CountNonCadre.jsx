import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { authInstance } from '../../../axiosConfig'; // Assuming authInstance is already configured

// material-ui
import { useTheme, styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

// assets
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';  // Icon for Cadre

// project imports
import MainCard from 'ui-component/cards/MainCard';
import TotalIncomeCard from 'ui-component/cards/Skeleton/TotalIncomeCard';

// styles
const CardWrapper = styled(MainCard)(({ theme }) => ({
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(210.04deg, #6baa1e -50.94%, rgba(144, 202, 249, 0) 83.49%)`, // Changer la couleur ici
    borderRadius: '50%',
    top: -30,
    right: -180
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 210,
    height: 210,
    background: `linear-gradient(140.9deg, #6baa1e -14.02%, rgba(144, 202, 249, 0) 70.50%)`, // Changer la couleur ici
    borderRadius: '50%',
    top: -160,
    right: -130
  }
}));


// ==============================|| DASHBOARD - TOTAL INCOME LIGHT CARD ||============================== //

const TotalIncomeLightCard = ({ isLoading, label }) => {
  const theme = useTheme();
  const [nonCadresCount, setNonCadresCount] = useState(null);

  useEffect(() => {
        const fetchUserCount = async () => {
          try {
            // Remplacez l'URL par celle de votre API backend
            const response = await authInstance.get(`/StatUser/user/count`);
            
            // Extraire uniquement le total Cadre + NonCadre
            const nonCadre = response.data.NonCadre;
              // Mettre à jour l'état avec la valeur récupérée
            setNonCadresCount(nonCadre);
          } catch (err) {
            console.error('Erreur lors de la récupération du nombre de collaborateurs:', err);
            setError('Impossible de charger les données.');
          } finally {
            setLoading(false);
          }
        };
      
        fetchUserCount();
      }, []);

  return (
    <>
      {isLoading || nonCadresCount === null ? (
        <TotalIncomeCard />
      ) : (
        <CardWrapper border={false} content={false}>
          <Box sx={{ p: 2 }}>
            <List sx={{ py: 0 }}>
              <ListItem alignItems="center" disableGutters sx={{ py: 0 }}>
                <ListItemAvatar>
                  <Avatar
                    variant="rounded"
                    sx={{
                      ...theme.typography.commonAvatar,
                      ...theme.typography.largeAvatar,
                      bgcolor: '#e8f2dc',
                      color: '#6baa1e'
                    }}
                  >
                    <AdminPanelSettingsIcon fontSize="inherit" /> {/* Icon for "Cadre" */}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  sx={{ py: 0, mt: 0.45, mb: 0.45 }}
                  primary={
                    <Typography variant="h4">
                      {nonCadresCount} {/* Display the number of Cadres */}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="subtitle2" sx={{ color: 'grey.500', mt: 0.5 }}>
                     Non Cadre 
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>
        </CardWrapper>
      )}
    </>
  );
};

TotalIncomeLightCard.propTypes = {
  label: PropTypes.string.isRequired,
  isLoading: PropTypes.bool,
};

export default TotalIncomeLightCard;
