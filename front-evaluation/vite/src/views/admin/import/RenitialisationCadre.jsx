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

function ReinitialisationCadre() {
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
        miParcours: false,
        finale: false
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
            const res = await formulaireInstance.get(`/CadreReset/reset-status?annee=${annee}`);
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

        if (annee < 1900 || annee > 2100 || annee === '') {
            setMessage('L\'année doit être comprise entre 1900 et 2100.');
            setSeverity('error');
            return;
        }

        // Ouvrir la boîte de dialogue de confirmation au lieu de soumettre directement
        setOpenConfirmDialog(true);
    };

    const handleConfirmReset = async () => {
        // Fermer la boîte de dialogue
        setOpenConfirmDialog(false);
        
        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await formulaireInstance.post('/CadreReset/reset-cadre', {
                annee,
                ...selectedCadres
            });

            await AuditService.logAction(
                userId,
                'Réinitialisation des fichiers cadres',
                'Reset',
                null,
                null,
                {
                    annee,
                    selectedCadres
                }
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

    // Fonction pour obtenir la liste des cadres sélectionnés
    const getSelectedCadresList = () => {
        const cadresLabels = {
            evaluation: "Période d'évaluation",
            fixation: "Fixation des objectifs",
            miParcours: "Mi-parcours",
            finale: "Évaluation finale"
        };

        return Object.entries(selectedCadres)
            .filter(([key, value]) => value)
            .map(([key]) => cadresLabels[key])
            .join(', ');
    };

    return (
        <Box sx={{ mx: 'auto', maxWidth: '800px', p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Réinitialisation des Fichiers Cadres
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
                        { key: 'miParcours', label: "Mi-parcours" },
                        { key: 'finale', label: "Évaluation finale" }
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
                        Êtes-vous sûr de vouloir réinitialiser les cadres suivants pour l'année {annee} ?
                        <br /><br />
                        <strong>Cadres sélectionnés :</strong>
                        <br />
                        {getSelectedCadresList() || 'Aucun cadre sélectionné'}
                        <br /><br />
                        <Alert severity="warning">
                            Cette action est irréversible et supprimera toutes les données associées à ces cadres.
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

export default ReinitialisationCadre;