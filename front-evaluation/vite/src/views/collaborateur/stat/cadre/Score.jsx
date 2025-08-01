import React, { useState, useEffect } from "react";
import { Card, CardContent, Typography, CircularProgress } from "@mui/material";
import { LineChart } from "@mui/x-charts";
import { formulaireInstance } from "../../../../axiosConfig";

function ScoreChart({ userId, phase }) {
    const [chartData, setChartData] = useState({ xData: [], yData: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await formulaireInstance.get(
                    `/Stat/getScoreByPhase/${userId}/${phase}`
                );
                const data = response.data;

                // Conversion de l'année d'évaluation en chaîne simple (sans virgules ni séparateurs)
                const xData = data.map((item) => item.evaluationYear.toString());
                const yData = data.map((item) => item.score);

                setChartData({ xData, yData });
                setLoading(false);
            } catch (err) {
                setError("Erreur lors du chargement des données.");
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, phase]);

    if (loading)
        return (
            <Card>
                <CardContent>
                    <Typography variant="h5">Chargement...</Typography>
                    <CircularProgress />
                </CardContent>
            </Card>
        );

    if (error)
        return (
            <Card>
                <CardContent>
                    <Typography variant="h5" color="error">
                        {error}
                    </Typography>
                </CardContent>
            </Card>
        );

    return (
        <Card>
            <CardContent>
                <LineChart
                    xAxis={[
                        {
                            data: chartData.xData,
                            type: "category",  
                            scaleType: "band",  
                        },
                    ]}
                    series={[
                        {
                            data: chartData.yData,
                            area: true,
                        },
                    ]}
                    width={500}
                    height={300}
                />

            </CardContent>
        </Card>
    );
}

export default ScoreChart;
