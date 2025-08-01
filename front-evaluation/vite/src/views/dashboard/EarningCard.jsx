import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import GroupIcon from '@mui/icons-material/Group'; // Remplacement de PersonIcon par GroupIcon
import axios from 'axios';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { authInstance } from '../../axiosConfig';

/**
 * Composant UserCard qui affiche le nombre de collaborateurs directs d'un supérieur.
 *
 * @param {string} superiorId - L'ID du supérieur pour lequel récupérer le nombre de collaborateurs.
 * @param {string} label - Le label à afficher sous le nombre de collaborateurs.
 */
const UserCard = ({ superiorId, label }) => {
  const theme = useTheme();

  // États locaux pour la gestion des données, du chargement et des erreurs
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  // Effet pour récupérer le nombre de collaborateurs lorsque le composant monte ou que superiorId change
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        // Remplacez l'URL par celle de votre API backend
        const response = await authInstance.get(`/StatUser/user/subordinates/count`, {
          params: { superiorId: userId },
        });
        setUserCount(response.data);
      } catch (err) {
        console.error('Erreur lors de la récupération du nombre de collaborateurs:', err);
        setError('Impossible de charger les données.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCount();
  }, [userId]);

  // Affichage en cours de chargement
  if (loading) {
    return (
      <Card
        sx={{
          height: '100%',
          borderRadius: 2,
          boxShadow: 2,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 2,
        }}
      >
        <CircularProgress />
      </Card>
    );
  }

  // Affichage en cas d'erreur
  if (error) {
    return (
      <Card
        sx={{
          height: '100%',
          borderRadius: 2,
          boxShadow: 2,
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 2,
          bgcolor: theme.palette.error.light,
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Card>
    );
  }

  // Affichage des données récupérées
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      {/* Partie Gauche (Icône) */}
      <Box
        sx={{
          width: '50%',
          bgcolor: theme.palette.primary.main,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Avatar
          sx={{
            bgcolor: theme.palette.primary.dark,
            width: 48,
            height: 48,
          }}
        >
          <GroupIcon fontSize="large" sx={{ color: '#fff' }} /> {/* Utilisation de GroupIcon */}
        </Avatar>
      </Box>

      {/* Partie Droite (Contenu) */}
      <CardContent
        sx={{
          width: '75%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {userCount}
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          Nombre de vos collaborateurs directs
        </Typography>
      </CardContent>
    </Card>
  );
};

UserCard.propTypes = {
  superiorId: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

export default UserCard;
