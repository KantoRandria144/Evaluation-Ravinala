import React, { useState, useEffect } from 'react';
import { formulaireInstance } from '../../../axiosConfig';
import { Grid, Typography, Button, Box, Alert, TextField, Checkbox, FormControlLabel } from '@mui/material';
import AuditService from '../../../services/AuditService';

function RenitialisationCadre() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [importStatus, setImportStatus] = useState({});
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCadres, setSelectedCadres] = useState({
    evaluation: false,
    fixation: false,
    miParcours: false,
    finale: false
  });
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  useEffect(() => {
    setMessage('');
    setSeverity('success');
    setIsSubmitted(false);
  }, [annee]);

  useEffect(() => {
    handleCheckImportStatus();
  }, [annee]);

  const handleCheckImportStatus = async () => {
    try {
      const res = await formulaireInstance.get(`/Import/import-status?annee=${annee}`);
      await AuditService.logAction(
        userId,
        'Vérification du statut d\'importation des cadres',
        'Import',
        null
      );
      setImportStatus(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération du statut d'importation.");
      setImportStatus({});
    }
  };

  const handleCheckboxChange = (event) => {
    setSelectedCadres({
      ...selectedCadres,
      [event.target.name]: event.target.checked
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitted(true);

    if (!selectedCadres.evaluation && !selectedCadres.fixation && 
        !selectedCadres.miParcours && !selectedCadres.finale) {
      setMessage('Veuillez sélectionner au moins un cadre à réinitialiser.');
      setSeverity('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setSeverity('success');

    try {
      const response = await formulaireInstance.post('/Import/reset-cadre', {
        annee,
        ...selectedCadres
      });
      await AuditService.logAction(
        userId,
        'Réinitialisation des cadres',
        'Import',
        null
      );

      if (response.status === 200) {
        setMessage('Cadres réinitialisés avec succès.');
        setSeverity('success');
        setSelectedCadres({
          evaluation: false,
          fixation: false,
          miParcours: false,
          finale: false
        });
        setIsSubmitted(false);
        await handleCheckImportStatus();
      } else {
        setMessage(`Erreur : ${response.statusText}`);
        setSeverity('error');
      }
    } catch (error) {
      let errorMsg = 'Une erreur est survenue.';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        } else {
          errorMsg = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      setMessage(`Erreur : ${errorMsg}`);
      setSeverity('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ mx: 'auto', maxWidth: '800px', padding: '20px' }}>
      <Typography variant="h5" gutterBottom>
        Réinitialisation des cadres
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <TextField 
            label="Année" 
            type="number" 
            value={annee} 
            onChange={(e) => setAnnee(e.target.value)} 
            fullWidth 
          />
        </Grid>
      </Grid>

      {message && (
        <Grid item xs={12} sx={{ mt: 2, mb: 2 }}>
          <Alert severity={severity}>{message}</Alert>
        </Grid>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedCadres.evaluation}
                  onChange={handleCheckboxChange}
                  name="evaluation"
                  disabled={isLoading}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">Période d'évaluation</Typography>
                  {importStatus?.evaluation && (
                    <Typography 
                      variant="caption" 
                      color="green"
                    >
                      Déjà importé
                    </Typography>
                  )}
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedCadres.fixation}
                  onChange={handleCheckboxChange}
                  name="fixation"
                  disabled={isLoading}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">Fixation des objectifs</Typography>
                  {importStatus?.fixation && (
                    <Typography 
                      variant="caption" 
                      color="green"
                    >
                      Déjà importé
                    </Typography>
                  )}
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedCadres.miParcours}
                  onChange={handleCheckboxChange}
                  name="miParcours"
                  disabled={isLoading}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">Mi-parcours</Typography>
                  {importStatus?.miParcours && (
                    <Typography 
                      variant="caption" 
                      color="green"
                    >
                      Déjà importé
                    </Typography>
                  )}
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedCadres.finale}
                  onChange={handleCheckboxChange}
                  name="finale"
                  disabled={isLoading}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1">Évaluation finale</Typography>
                  {importStatus?.finale && (
                    <Typography 
                      variant="caption" 
                      color="green"
                    >
                      Déjà importé
                    </Typography>
                  )}
                </Box>
              }
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              variant="contained" 
              color="primary" 
              type="submit" 
              fullWidth 
              disabled={isLoading}
            >
              {isLoading ? 'Réinitialisation en cours...' : 'Réinitialiser les Cadres'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default RenitialisationCadre;