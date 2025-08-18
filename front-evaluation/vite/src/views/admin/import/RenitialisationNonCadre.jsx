import React, { useState, useEffect } from 'react';
import { formulaireInstance } from '../../../axiosConfig';
import {
    Grid,
    Typography,
    Button,
    Box,
    Alert,
    TextField,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import AuditService from '../../../services/AuditService';

function RenitialisationNonCadre() {
    const [annee, setAnnee] = useState(new Date().getFullYear());
    const [importStatus, setImportStatus] = useState({});
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorDetails, setErrorDetails] = useState(null);
    const [selectedCadres, setSelectedCadres] = useState({
        evaluation: false,
        fixation: false,
        miParcoursIndicators: false,
        miParcoursCompetence: false,
        finale: false,
        help: false,
        userHelpContent: false
    });

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  useEffect(() => {
        if (annee) {
            setMessage('');
            setSeverity('success');
            setErrorDetails(null);
            setIsSubmitted(false);
            handleCheckResetStatus();
        }
    }, [annee]);

    const handleCheckResetStatus = async () => {
        try {
            const res = await formulaireInstance.get(`/NonCadreReset/reset-status?annee=${annee}`);
            
            setImportStatus(res.data);
        } catch (error) {
            console.error("Erreur lors de la récupération du statut.", error);
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
        setErrorDetails(null);

        if (!Object.values(selectedCadres).some(value => value)) {
            setMessage('Veuillez sélectionner au moins un cadre à réinitialiser.');
            setSeverity('error');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await formulaireInstance.post('/NonCadreReset/reset-non-cadre', {
                annee,
                ...selectedCadres
            });

          await AuditService.logAction(
            userId,
            'Réinitialisation des reset-non-cadre',
            'Import',
            null
          );

            if (response.status === 200) {
                setMessage('Cadres réinitialisés avec succès.');
                setSeverity('success');
                setSelectedCadres({
                    evaluation: false,
                    fixation: false,
                    miParcoursIndicators: false,
                    miParcoursCompetence: false,
                    finale: false,
                    help: false,
                    userHelpContent: false
                });
                setIsSubmitted(false);
                await handleCheckResetStatus();
            } else {
                setMessage(`Erreur : ${response.statusText}`);
                setSeverity('error');
            }
        } catch (error) {
            console.error(error);
            let errorMsg = 'Une erreur est survenue.';
            if (error.response?.data) {
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else {
                    errorMsg = JSON.stringify(error.response.data);
                }
                setErrorDetails(error.response.data);
            } else if (error.message) {
                errorMsg = error.message;
            }
            setMessage(`Erreur : ${errorMsg}`);
            setSeverity('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box sx={{ mx: 'auto', maxWidth: '800px', p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Réinitialisation des Fichiers Non-Cadres
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
                    <Alert severity={severity}>
                        {message}
                        {errorDetails && (
                            <Box mt={1}>
                                {errorDetails.fileName && <Typography variant="body2"><strong>Fichier :</strong> {errorDetails.fileName}</Typography>}
                                {errorDetails.lineNumber && <Typography variant="body2"><strong>Ligne :</strong> {errorDetails.lineNumber}</Typography>}
                                {errorDetails.errorMessage && <Typography variant="body2"><strong>Erreur :</strong> {errorDetails.errorMessage}</Typography>}
                            </Box>
                        )}
                    </Alert>
                </Grid>
            )}

            <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                    {[
                        { key: 'evaluation', label: "Période d'évaluation" },
                        { key: 'fixation', label: "Fixation des objectifs" },
                        { key: 'miParcoursIndicators', label: "Mi-parcours" },
                        { key: 'miParcoursCompetence', label: "Indicateur de compétences en mi-Parcours" },
                        { key: 'finale', label: "Évaluation finale" },
                        { key: 'help', label: "Sujets d'aide au développement du collaborateur" },
                        { key: 'userHelpContent', label: "Contenus des sujets" }
                    ].map(({ key, label }) => (
                        <Grid item xs={12} sm={6} key={key}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={selectedCadres[key]}
                                        onChange={handleCheckboxChange}
                                        name={key}
                                        disabled={isSubmitting}
                                    />
                                }
                                label={
                                    <Box>
                                        <Typography variant="subtitle1">{label}</Typography>
                                        {importStatus?.[key] && (
                                            <Typography variant="caption" color="green">
                                                Déjà importé
                                            </Typography>
                                        )}
                                    </Box>
                                }
                            />
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            type="submit"
                            fullWidth
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Réinitialisation en cours...' : 'Réinitialiser les Cadres'}
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
}

export default RenitialisationNonCadre;
