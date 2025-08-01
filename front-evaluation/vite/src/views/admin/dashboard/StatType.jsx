    import React, { useEffect, useState } from 'react';
    import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    } from 'recharts';
    import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Avatar,
    Divider,
    CircularProgress,
    } from '@mui/material';
    import { formulaireInstance } from '../../../axiosConfig';

    const MarketShareWidget = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fonction pour récupérer les données depuis l'API
    const fetchData = async () => {
        try {
        const response = await formulaireInstance.get('/Stat/averageScoresByYearForAll');
        setData(response.data);
        setLoading(false);
        } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        setError('Impossible de récupérer les données.');
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Préparer les données pour Recharts
    const prepareRechartsData = () => {
        if (!data) return [];

        const years = Array.from(
        new Set([
            ...data.cadreAveragesByYear.map(item => item.year),
            ...data.nonCadreAveragesByYear.map(item => item.year),
        ])
        ).sort((a, b) => a - b); // Trier les années par ordre croissant

        return years.map(year => {
        const cadreYearData = data.cadreAveragesByYear.find(item => item.year === year);
        const nonCadreYearData = data.nonCadreAveragesByYear.find(item => item.year === year);
        return {
            year: year.toString(),
            Cadres: cadreYearData ? cadreYearData.averageScore : 0,
            'Non Cadres': nonCadreYearData ? nonCadreYearData.averageScore : 0,
        };
        });
    };

    const rechartsData = prepareRechartsData();

    return (
        <Grid container justifyContent="center" spacing={3}>
        <Grid item xs={12}>
            <Card>
            <CardContent>
                {/* Titre et Description */}
                <Grid container justifyContent="space-between" alignItems="center">
                <Grid item>
                    <Typography variant="h6" color="textPrimary">
                        Moyennes Annuelles des Contrats d'Objectifs
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Comparaison des scores moyens entre collaborateurs cadres et non cadres
                    </Typography>
                </Grid>
                </Grid>

                {/* Zone de Contenu */}
                <Box sx={{ width: '100%', height: '50vh', mt: 2 }}>
                {loading ? (
                    <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                    }}
                    >
                    <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                    }}
                    >
                    <Typography variant="h6" color="error">
                        {error}
                    </Typography>
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rechartsData} margin={{ top: 20, bottom: 5 }}>
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        {/* Suppression de la légende */}
                        {/* <Legend layout="vertical" verticalAlign="middle" align="left" /> */}
                        <Line type="monotone" dataKey="Cadres" stroke="#90caf9" />
                        <Line type="monotone" dataKey="Non Cadres" stroke="#6baa1e" />
                    </LineChart>
                    </ResponsiveContainer>
                )}
                </Box>

                {/* Affichage des Moyennes par Type */}
                {!loading && !error && data && (
                <Grid container spacing={2} sx={{ mt: 3 }} justifyContent="center">
                    <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" justifyContent="center">
                        <Avatar sx={{ bgcolor: '#90caf9', width: 40, height: 40, mr: 2, color:'#3f51b5' }}>
                        C
                        </Avatar>
                        <Box>
                        <Typography variant="h6">Cadres</Typography>
                        </Box>
                    </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                    <Box display="flex" alignItems="center" justifyContent="center">
                        <Avatar sx={{ bgcolor: '#6baa1e', color:'#ffffff', width: 40, height: 40, mr: 2 }}>
                        NC
                        </Avatar>
                        <Box>
                        <Typography variant="h6">Non Cadres</Typography>
                        </Box>
                    </Box>
                    </Grid>
                </Grid>
                )}
            </CardContent>
            </Card>
        </Grid>
        </Grid>
    );
    };

    export default MarketShareWidget;
