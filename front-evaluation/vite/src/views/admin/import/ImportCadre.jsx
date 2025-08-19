import React, { useState, useCallback, useEffect } from 'react';
import { formulaireInstance } from '../../../axiosConfig';

// Material-UI components
import { Grid, Typography, Button, Box, Alert, TextField } from '@mui/material';

import { useDropzone } from 'react-dropzone';
import AuditService from '../../../services/AuditService';

function ImportCadre() {
  const [evaluationFile, setEvaluationFile] = useState(null);
  const [fixationFile, setFixationFile] = useState(null);
  const [miParcoursFile, setMiParcoursFile] = useState(null);
  const [finaleFile, setFinaleFile] = useState(null);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [importStatus, setImportStatus] = useState({});
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  useEffect(() => {
    setMessage('');
    setSeverity('success');
    setIsSubmitted(false);
  }, [annee]);

  useEffect(() => {
  handleCheckImportStatus();
}, [annee, evaluationFile, fixationFile, miParcoursFile, finaleFile]);

  const FileDropzone = ({ label, file, setFile, isRequired, status }) => {
    const isDisabled = status === true;

    const onDrop = useCallback(
      (acceptedFiles) => {
        if (!isDisabled) {
          setFile(acceptedFiles[0]);
        }
      },
      [setFile, isDisabled]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple: false,
      accept: {
        'text/csv': ['.csv'],
        'application/vnd.ms-excel': ['.xls', '.xlsx']
      },
      disabled: isDisabled
    });

    const showError = isRequired && !file;

    return (
      <Box
        {...getRootProps()}
        sx={{
          border: showError ? '2px dashed red' : '2px dashed #ccc',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          backgroundColor: isDisabled ? '#f0f0f0' : isDragActive ? '#f0f8ff' : '#fafafa',
          opacity: isDisabled ? 0.6 : 1,
          height: '140px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <input {...getInputProps()} />
        <Typography variant="subtitle1">{label}</Typography>
        <Typography variant="body2" color="textSecondary">
          {file ? file.name : isDisabled ? 'Déjà importé' : 'Glissez-déposez un fichier ici ou cliquez'}
        </Typography>
        <Typography variant="caption" sx={{ mt: 1 }} color={status ? 'green' : 'orange'}>
          {status ? 'Déjà importé' : 'Pas encore importé'}
        </Typography>
      </Box>
    );
  };

  const handleCheckImportStatus = async () => {
    try {
      const res = await formulaireInstance.get(`/Import/import-status?annee=${annee}`);

      setImportStatus(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération du statut d'importation.");
      setImportStatus({});
    }
  };

const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitted(true);

    if (!evaluationFile && !fixationFile && !miParcoursFile && !finaleFile) {
      setMessage('Veuillez sélectionner au moins un fichier à importer.');
      setSeverity('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setSeverity('success');

    const formData = new FormData();
    formData.append('Annee', annee);
    formData.append('EvaluationFile', evaluationFile);
    formData.append('FixationFile', fixationFile);
    formData.append('MiParcoursFile', miParcoursFile);
    formData.append('FinaleFile', finaleFile);

    try {
      const response = await formulaireInstance.post('/Import/import-evaluation', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await AuditService.logAction(
        userId,
        'Importation des fichiers d\'évaluation cadre',
        'Import',
        null,
        null,
        {
          annee,
          files: {
            evaluation: evaluationFile?.name || null,
            fixation: fixationFile?.name || null,
            miParcours: miParcoursFile?.name || null,
            finale: finaleFile?.name || null
          }
        }
      );

      if (response.status === 200) {
        setMessage('Données importées avec succès.');
        setSeverity('success');
        setEvaluationFile(null);
        setFixationFile(null);
        setMiParcoursFile(null);
        setFinaleFile(null);
        setIsSubmitted(false);
        await handleCheckImportStatus(); // recharge le statut
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
        Importation par étape
      </Typography>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12}>
          <TextField label="Année" type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} fullWidth />
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
            <FileDropzone
              label="Période d'évaluation"
              file={evaluationFile}
              setFile={setEvaluationFile}
              status={importStatus?.evaluation}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FileDropzone
              label="Fixation des objectifs"
              file={fixationFile}
              setFile={setFixationFile}
              status={importStatus?.fixation}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FileDropzone label="Mi-parcours" file={miParcoursFile} setFile={setMiParcoursFile} status={importStatus?.miParcours} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FileDropzone label="Évaluation finale" file={finaleFile} setFile={setFinaleFile} status={importStatus?.finale} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Importation en cours...' : 'Importer les Fichiers'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default ImportCadre;
