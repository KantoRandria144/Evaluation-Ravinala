import React from 'react';
import ImportCadre from './ImportCadre';
import ImportNonCadre from './ImportNonCadre';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography } from '@mui/material';

function ImportCSV() {
    return (
        <Grid container spacing={2} direction="column">
            {/* Header Card */}
            <Grid item xs={12}>
                <MainCard>
                    <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item>
                            <Grid container direction="column" spacing={1}>
                                <Grid item>
                                    <Typography variant="subtitle2">Import</Typography>
                                </Grid>
                                <Grid item>
                                    <Typography variant="h3">Importer les évaluations à partir d'un fichier csv</Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </MainCard>
            </Grid>

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
        </Grid>
    );
}

export default ImportCSV;
