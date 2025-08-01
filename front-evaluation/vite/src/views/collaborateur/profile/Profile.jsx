import React, { useState, useEffect } from 'react';
import { Avatar, Box, Grid, Typography, CircularProgress, Alert , Button} from '@mui/material';
import { authInstance } from '../../../axiosConfig';

const Information = () => {
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [noSignature, setNoSignature] = useState(false);

  // Récupération des données utilisateur depuis le localStorage
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id || '';
  const userName = user.name || 'Inconnu';
  const matricule = user.matricule || 'N/A';
  const email = user.email || 'N/A';
  const departement = user.department || 'N/A';
  const poste = user.poste || 'N/A';
  const userType = user.typeUser || 'N/A';

  useEffect(() => {
    if (userId) {
      fetchSignature(userId);
    } else {
      setError("Impossible de récupérer l'ID utilisateur depuis le stockage local.");
    }
  }, [userId]);

  const fetchSignature = async (id) => {
    setLoading(true);
    setError('');
    setNoSignature(false); // Réinitialiser l'état
    try {
      const response = await authInstance.get(`/Signature/get-user-signature/${id}`);
      if (response.data && response.data.signature) {
        setSignature(response.data.signature); // Base64 de l'image
      } else {
        setNoSignature(true); // Aucun champ de signature
      }
    } catch (err) {
      console.error('Erreur lors de la récupération de la signature :', err);
      if (err.response?.status === 404) {
        setNoSignature(true); // Gérer le cas où l'utilisateur n'a pas encore de signature
      } else {
        setError(err.response?.data?.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Grid item xs={8} sx={{ p: 3 }}>
        <Grid container spacing={2} direction="column" alignItems="center">
          <Grid item xs={12} container justifyContent="flex-start" alignItems="center">
            <Avatar
              sx={{
                width: 100,
                height: 100,
                marginRight: 2, // Add some space between avatar and name
                backgroundColor: '#90caf9',
                color: '#3949ab',
                fontSize: '2rem'
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: '#333' }}>
                {userName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                {userType}
              </Typography>
            </Box>
          </Grid>

          {/* Form Fields */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#555', mb: 0.5 }}>
                    Matricule
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#333' }}>
                    {matricule}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#555', mb: 0.5 }}>
                    Département
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#333' }}>
                    {departement}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#555', mb: 0.5 }}>
                    Adresse Email
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#333' }}>
                    {email}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#555', mb: 0.5 }}>
                    Poste
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#333' }}>
                    {poste}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{ p: 2 }}>
                  {loading ? (
                    <CircularProgress />
                  ) : error ? (
                    <Alert severity="error">{error}</Alert>
                  ) : noSignature ? (
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      Pas encore de signature disponible
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="body2" sx={{ color: '#555' }}>
                        Votre signature <span style={{ color: '#888', fontStyle: 'italic' }}> (Visible uniquement par vous) </span>
                      </Typography>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={`data:image/png;base64,${signature}`}
                          alt="Signature"
                          style={{
                            maxWidth: '300px',
                            maxHeight: '200px',
                            border: '1px solid #ccc',
                            borderRadius: '5px',
                            userSelect: 'none', // Désactive la sélection
                            pointerEvents: 'none' // Limite les interactions
                          }}
                          onContextMenu={(e) => e.preventDefault()} // Empêche le clic droit
                          onDragStart={(e) => e.preventDefault()} // Empêche le glisser-déposer
                        />
                      </div>
                      <Box sx={{ mt: 2 }}>
                        <a href={`data:image/png;base64,${signature}`} download="signature.png" style={{ textDecoration: 'none' }}>
                            <Button variant="contained" sx={{ mr: 2 }}>
                              Télécharger
                            </Button>
                        </a>
                      </Box>
                    </>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Information;
