import React from 'react';
import RenitialisationCadre from './RenitialisationCadre';
import RenitialisationNonCadre from './RenitialisationNonCadre';
import MainCard from 'ui-component/cards/MainCard';
import { Grid, Typography } from '@mui/material';

function RenitialisationCSV() {
    return (
        <Grid container spacing={2} direction="column">
            {/* Header Card */}
            <Grid item xs={12}>
                <MainCard>
                    <Grid container alignItems="center" justifyContent="space-between">
                        <Grid item>
                            <Grid container direction="column" spacing={1}>
                                <Grid item>
                                    <Typography variant="subtitle2">Réinitialisation</Typography>
                                </Grid>
                                <Grid item>
                                    <Typography variant="h3">Réinitialiser les cadres d'évaluation</Typography>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                </MainCard>
            </Grid>

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
        </Grid>
    );
}

export default RenitialisationCSV;