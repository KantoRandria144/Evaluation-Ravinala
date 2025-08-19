import React, { useState, useEffect } from 'react';
import ImportCadre from './ImportCadre';
import ImportNonCadre from './ImportNonCadre';
import RenitialisationCadre from './RenitialisationCadre';
import RenitialisationNonCadre from './RenitialisationNonCadre';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography, Button, Box, Alert, Snackbar } from '@mui/material';
import { formulaireInstance } from '../../../axiosConfig';
import AuditService from 'services/AuditService';

function ImportCSV() {
    const [activeTab, setActiveTab] = useState('import'); // 'import' ou 'reinitialisation'
    const [canImport, setCanImport] = useState(false); // État pour la permission d'importation
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' }); // Snackbar pour notifications
    const IMPORT_EVALUATION = 27; // ID de l'habilitation pour importer les évaluations

    // Vérification des permissions
    const checkPermissions = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user')) || {};
            const userId = user.id;

            const importResponse = await formulaireInstance.get(
                `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${IMPORT_EVALUATION}`
            );
            setCanImport(importResponse.data.hasAccess);

            // Log audit pour la vérification des permissions
            await AuditService.logAction(
                userId,
                'Vérification des permissions pour importer/réinitialiser les évaluations',
                'CheckPermission',
                null,
                null,
                { habilitationId: IMPORT_EVALUATION, hasAccess: importResponse.data.hasAccess }
            );
        } catch (error) {
            console.error('Erreur lors de la vérification des autorisations :', error);
            setCanImport(false); // Par sécurité, désactiver l'accès en cas d'erreur
            setSnackbar({
                open: true,
                message: 'Erreur lors de la vérification des autorisations.',
                severity: 'error'
            });

            // Log audit pour l'erreur de vérification
            const user = JSON.parse(localStorage.getItem('user')) || {};
            const userId = user.id;
            await AuditService.logAction(
                userId,
                'Erreur lors de la vérification des permissions pour importer/réinitialiser les évaluations',
                'CheckPermission',
                null,
                null,
                { habilitationId: IMPORT_EVALUATION, error: error.message }
            );
        }
    };

    // Exécuter la vérification au montage du composant
    useEffect(() => {
        checkPermissions();
    }, []);

    // Fermer le Snackbar
    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <Grid container spacing={2} direction="column">
            {/* Header Card */}
            <Grid item xs={12}>
                <MainCard>
                    <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item>
                            <Grid container direction="column" spacing={1}>
                                <Grid item>
                                    <Typography variant="subtitle2">
                                        {activeTab === 'import' ? 'Import' : 'Réinitialisation'}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Typography variant="h3">
                                        {activeTab === 'import'
                                            ? 'Importer les évaluations à partir d\'un fichier csv'
                                            : 'Réinitialiser les cadres d\'évaluation'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </MainCard>
            </Grid>

            {/* Navigation Buttons - Afficher uniquement si l'utilisateur a la permission */}
            {canImport && (
                <Grid item xs={12}>
                    <MainCard>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                            <Button
                                variant={activeTab === 'import' ? 'contained' : 'outlined'}
                                color="primary"
                                onClick={() => handleTabChange('import')}
                                size="large"
                            >
                                Import CSV
                            </Button>
                            <Button
                                variant={activeTab === 'reinitialisation' ? 'contained' : 'outlined'}
                                color="secondary"
                                onClick={() => handleTabChange('reinitialisation')}
                                size="large"
                            >
                                Réinitialisation
                            </Button>
                        </Box>
                    </MainCard>
                </Grid>
            )}

            {/* Message si l'utilisateur n'a pas la permission */}
            {!canImport && (
                <Grid item xs={12}>
                    <MainCard>
                        <Alert severity="error">
                            Vous n'avez pas l'autorisation d'importer ou de réinitialiser les évaluations.
                        </Alert>
                    </MainCard>
                </Grid>
            )}

            {/* Content based on active tab - Afficher uniquement si l'utilisateur a la permission */}
            {canImport && activeTab === 'import' && (
                <>
                    {/* ImportCadre Card */}
                    <Grid item xs={12}>
                        <MainCard>
                            <ImportCadre />
                        </MainCard>
                    </Grid>
                    {/* ImportNonCadre Card */}
                    <Grid item xs={12}>
                        <MainCard>
                            <ImportNonCadre />
                        </MainCard>
                    </Grid>
                </>
            )}

            {canImport && activeTab === 'reinitialisation' && (
                <>
                    {/* RenitialisationCadre Card */}
                    <Grid item xs={12}>
                        <MainCard>
                            <RenitialisationCadre />
                        </MainCard>
                    </Grid>
                    {/* RenitialisationNonCadre Card */}
                    <Grid item xs={12}>
                        <MainCard>
                            <RenitialisationNonCadre />
                        </MainCard>
                    </Grid>
                </>
            )}

            {/* Snackbar pour notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                message={snackbar.message}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Grid>
    );
}

export default ImportCSV;