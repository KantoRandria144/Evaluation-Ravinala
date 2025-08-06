import React, { useState, useEffect } from 'react';
import { formulaireInstance } from '../../../axiosConfig';
import { Grid, Typography, Button, Box, Alert, TextField, Checkbox, FormControlLabel } from '@mui/material';

function ReinitialisationCadre() {
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
      const res = await formulaireInstance.get(`/CadreReset/reset-status?annee=${annee}`);
      setImportStatus({
        evaluation: res.data.Evaluation,
        fixation: res.data.Fixation,
        miParcours: res.data.MiParcours,
        finale: res.data.Finale
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du statut de réinitialisation:", error);
      setImportStatus({
        evaluation: false,
        fixation: false,
        miParcours: false,
        finale: false
      });
    }
  };

  const handleCheckboxChange = (event) => {
    setSelectedCadres({
      ...selectedCadres,
      [event.target.name]: event.target.checked
    });
  };

  const handleYearChange = (e) => {
    const value = e.target.value;
    // Permettre la saisie de tous les nombres, même temporairement hors limites
    if (value === '' || !isNaN(Number(value))) {
      setAnnee(value === '' ? '' : Number(value));
    }
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

    if (annee < 1900 || annee > 2100 || annee === '') {
      setMessage('L\'année doit être comprise entre 1900 et 2100.');
      setSeverity('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setSeverity('success');

    try {
      const response = await formulaireInstance.post('/CadreReset/reset-cadre', {
        Annee: annee,
        Evaluation: selectedCadres.evaluation,
        Fixation: selectedCadres.fixation,
        MiParcours: selectedCadres.miParcours,
        Finale: selectedCadres.finale
      });

      if (response.status === 200) {
        setMessage(response.data.Message || 'Cadres réinitialisés avec succès.');
        setSeverity('success');
        setSelectedCadres({
          evaluation: false,
          fixation: false,
          miParcours: false,
          finale: false
        });
        setIsSubmitted(false);
        await handleCheckImportStatus();
      }
    } catch (error) {
      let errorMsg = 'Une erreur est survenue.';
      if (error.response?.data) {
        if (error.response.data.ErrorMessage) {
          errorMsg = error.response.data.ErrorMessage;
        } else if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
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
            onChange={handleYearChange}
            fullWidth
            error={isSubmitted && (annee < 1900 || annee > 2100 || annee === '')}
            helperText={isSubmitted && (annee < 1900 || annee > 2100 || annee === '') ? 
              'L\'année doit être comprise entre 1900 et 2100.' : ''}
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
                  {importStatus.evaluation && (
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
                  {importStatus.fixation && (
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
                  {importStatus.miParcours && (
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
                  {importStatus.finale && (
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

export default ReinitialisationCadre;