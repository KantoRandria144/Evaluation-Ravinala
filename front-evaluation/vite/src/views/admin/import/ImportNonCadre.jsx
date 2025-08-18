import React, { useState, useCallback, useEffect } from 'react';
import { formulaireInstance } from '../../../axiosConfig';
import { Grid, Typography, Button, Box, Alert, TextField } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import AuditService from "../../../services/AuditService";

const FileDropzone = ({ label, file, setFile, isRequired, isSubmitted, status }) => {
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
            'application/vnd.ms-excel': ['.xls', '.xlsx'],
        },
        disabled: isDisabled
    });

    const showError = isRequired && isSubmitted && !file;

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
                height: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
            }}
        >
            <input {...getInputProps()} />
            <Typography variant="subtitle1" gutterBottom>
                {label} {isRequired && <span style={{ color: 'red' }}>*</span>}
            </Typography>
            <Typography variant="body2" color="textSecondary">
                {file ? file.name : isDisabled ? 'Déjà importé' : 'Glissez-déposez un fichier ici ou cliquez'}
            </Typography>
            <Typography variant="caption" sx={{ mt: 1 }} color={status ? 'green' : 'orange'}>
                {status ? 'Déjà importé' : 'Pas encore importé'}
            </Typography>
        </Box>
    );
};

const ImportNonCadre = () => {
    const [evaluationFile, setEvaluationFile] = useState(null);
    const [fixationFile, setFixationFile] = useState(null);
    const [miParcoursIndicatorsFile, setMiParcoursIndicatorsFile] = useState(null);
    const [miParcoursCompetenceFile, setMiParcoursCompetenceFile] = useState(null);
    const [finaleFile, setFinaleFile] = useState(null);
    const [helpFile, setHelpFile] = useState(null);
    const [userHelpContentFile, setUserHelpContentFile] = useState(null);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorDetails, setErrorDetails] = useState(null);
    const [annee, setAnnee] = useState(new Date().getFullYear());
    const [importStatus, setImportStatus] = useState({});
    const user = JSON.parse(localStorage.getItem('user')) || {};
    const userId = user.id;

    useEffect(() => {
        if (annee) {
            setMessage('');
            setSeverity('success');
            setErrorDetails(null);
            setIsSubmitted(false);
            handleCheckImportStatus();
        }
    }, [annee]);

    const handleCheckImportStatus = async () => {
        try {
            const res = await formulaireInstance.get(`/NonCadreImport/import-status?annee=${annee}`);
            await AuditService.logAction(
                userId,
                'Vérification du statut d\'importation des fichiers non-cadres',
                'Import',
                null
            );
            setImportStatus(res.data);
        } catch (error) {
            console.error("Erreur lors de la récupération du statut d'importation.", error);
            setImportStatus({});
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsSubmitted(true);
        setErrorDetails(null);

        const formData = new FormData();
        formData.append('Annee', annee);
        if (evaluationFile) formData.append('EvaluationFile', evaluationFile);
        if (fixationFile) formData.append('FixationFile', fixationFile);
        if (miParcoursIndicatorsFile) formData.append('MiParcoursIndicatorsFile', miParcoursIndicatorsFile);
        if (miParcoursCompetenceFile) formData.append('MiParcoursCompetenceFile', miParcoursCompetenceFile);
        if (finaleFile) formData.append('FinaleFile', finaleFile);
        if (helpFile) formData.append('HelpFile', helpFile);
        if (userHelpContentFile) formData.append('UserHelpContentFile', userHelpContentFile);

        if (!formData.has('EvaluationFile') && !formData.has('FixationFile') && !formData.has('MiParcoursIndicatorsFile') && !formData.has('MiParcoursCompetenceFile') && !formData.has('FinaleFile') && !formData.has('HelpFile')&& !formData.has('UserHelpContentFile')) {
            setMessage('Veuillez importer au moins un fichier obligatoire.');
            setSeverity('error');
            return;
        }
        

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await formulaireInstance.post('/NonCadreImport/import-non-cadre-evaluation', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            await AuditService.logAction(
                userId,
                'Importation des fichiers d\'évaluation non-cadres',
                'Import',
                null
            );

            if (response.status === 200) {
                setMessage('Données importées avec succès.');
                setSeverity('success');
                resetFiles();
                await handleCheckImportStatus();
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
                // setErrorDetails(error.response.data);
            } else if (error.message) {
                errorMsg = error.message;
            }
            setMessage(`Erreur : ${errorMsg}`);
            setSeverity('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetFiles = () => {
        setEvaluationFile(null);
        setFixationFile(null);
        setMiParcoursIndicatorsFile(null);
        setMiParcoursCompetenceFile(null);
        setFinaleFile(null);
        setHelpFile(null);
        setUserHelpContentFile(null);
        setIsSubmitted(false);
        setErrorDetails(null);
    };

    return (
        <Box sx={{ mx: 'auto', maxWidth: '800px', p: 3 }}>
            <Typography variant="h5" gutterBottom>
                Importation des Fichiers Non-Cadres
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                    <TextField label="Année" type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} fullWidth />
                </Grid>
                {/* <Grid item xs={4}>
                    <Button variant="outlined" fullWidth sx={{ height: '100%' }} onClick={handleCheckImportStatus}>
                        Valider
                    </Button>
                </Grid> */}
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
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Période d'évaluation" file={evaluationFile} setFile={setEvaluationFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.evaluation} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Fixation des objectifs" file={fixationFile} setFile={setFixationFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.fixation} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Mi-parcours" file={miParcoursIndicatorsFile} setFile={setMiParcoursIndicatorsFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.miParcoursIndicators} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Indicateur de compétences en mi-Parcours" file={miParcoursCompetenceFile} setFile={setMiParcoursCompetenceFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.miParcoursCompetence} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Évaluation finale" file={finaleFile} setFile={setFinaleFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.finale} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Sujets d’aide au développement du collaborateur" file={helpFile} setFile={setHelpFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.help} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FileDropzone label="Contenus des sujets" file={userHelpContentFile} setFile={setUserHelpContentFile} isRequired={false} isSubmitted={isSubmitted} status={importStatus?.userHelpContent} />
                    </Grid>
                    <Grid item xs={12}>
                        <Button variant="contained" color="primary" type="submit" fullWidth disabled={isSubmitting}>
                            {isSubmitting ? 'Importation en cours...' : 'Importer les Fichiers'}
                        </Button>
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};

export default ImportNonCadre;
