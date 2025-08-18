import React, { useState } from 'react';
import ImportCadre from './ImportCadre';
import ImportNonCadre from './ImportNonCadre';
import RenitialisationCadre from './RenitialisationCadre';
import RenitialisationNonCadre from './RenitialisationNonCadre';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography, Button, Box } from '@mui/material';

function ImportCSV() {
    const [activeTab, setActiveTab] = useState('import'); // 'import' ou 'reinitialisation'

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
                                            : 'Réinitialiser les cadres d\'évaluation'
                                        }
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </MainCard>
            </Grid>

            {/* Navigation Buttons */}
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

            {/* Content based on active tab */}
            {activeTab === 'import' && (
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

            {activeTab === 'reinitialisation' && (
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
        </Grid>
    );
}

export default ImportCSV;