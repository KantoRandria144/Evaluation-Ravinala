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
    FormControlLabel,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
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
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);

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

    const handleYearChange = (e) => {
        const value = e.target.value;
        if (value === '' || !isNaN(Number(value))) {
            setAnnee(value === '' ? '' : Number(value));
        }
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

        // Vérification de la validité de l'année
        if (annee < 1900 || annee > 2100 || annee === '') {
            setMessage('L\'année doit être comprise entre 1900 et 2100.');
            setSeverity('error');
            return;
        }

        // Ouvrir la boîte de dialogue de confirmation
        setOpenConfirmDialog(true);
    };

    const handleConfirmReset = async () => {
        // Fermer la boîte de dialogue
        setOpenConfirmDialog(false);
        
        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await formulaireInstance.post('/NonCadreReset/reset-non-cadre', {
                annee,
                ...selectedCadres
            });

            await AuditService.logAction(
                userId,
                'Réinitialisation des fichiers non-cadres',
                'Reset',
                null,
                null,
                {
                    annee,
                    selectedCadres
                }
            );

            if (response.status === 200) {
                setMessage('Non-cadres réinitialisés avec succès.');
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

    const handleCancelReset = () => {
        setOpenConfirmDialog(false);
    };

    // Fonction pour obtenir la liste des non-cadres sélectionnés
    const getSelectedCadresList = () => {
        const cadresLabels = {
            evaluation: "Période d'évaluation",
            fixation: "Fixation des objectifs",
            miParcoursIndicators: "Mi-parcours",
            miParcoursCompetence: "Indicateur de compétences en mi-Parcours",
            finale: "Évaluation finale",
            help: "Sujets d'aide au développement du collaborateur",
            userHelpContent: "Contenus des sujets"
        };

        return Object.entries(selectedCadres)
            .filter(([key, value]) => value)
            .map(([key]) => cadresLabels[key])
            .join(', ');
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
                            {isSubmitting ? 'Réinitialisation en cours...' : 'Réinitialiser les Non-Cadres'}
                        </Button>
                    </Grid>
                </Grid>
            </form>

            {/* Boîte de dialogue de confirmation */}
            <Dialog
                open={openConfirmDialog}
                onClose={handleCancelReset}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    Confirmer la réinitialisation
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Êtes-vous sûr de vouloir réinitialiser les non-cadres suivants pour l'année {annee} ?
                        <br /><br />
                        <strong>Non-cadres sélectionnés :</strong>
                        <br />
                        {getSelectedCadresList() || 'Aucun non-cadre sélectionné'}
                        <br /><br />
                        <Alert severity="warning">
                            Cette action est irréversible et supprimera toutes les données associées à ces non-cadres.
                        </Alert>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelReset} color="primary">
                        Annuler
                    </Button>
                    <Button 
                        onClick={handleConfirmReset} 
                        color="error" 
                        autoFocus
                        variant="contained"
                    >
                        Confirmer la réinitialisation
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default RenitialisationNonCadre;