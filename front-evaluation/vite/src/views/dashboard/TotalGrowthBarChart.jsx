import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { formulaireInstance } from '../../axiosConfig';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

// third-party
import Chart from 'react-apexcharts';

// project imports
import SkeletonTotalGrowthBarChart from 'ui-component/cards/Skeleton/TotalGrowthBarChart';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// chart data
import chartData from './chart-data/total-growth-bar-chart';

const status = [
  { value: 'Évaluation Finale', label: 'Évaluation Finale' }
  // Vous pouvez ajouter d'autres phases si nécessaire
];

const years = Array.from(new Array(5), (val, index) => new Date().getFullYear() - index);

const TotalGrowthBarChart = ({ isLoading }) => {
  const [phase, setPhase] = useState('Évaluation Finale');
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const theme = useTheme();

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const managerId = user.id;

  const { primary } = theme.palette.text;
  const divider = theme.palette.divider;
  const grey500 = theme.palette.grey[500];

  const primary200 = theme.palette.primary[200];
  const primaryDark = theme.palette.primary.dark;
  const secondaryMain = theme.palette.secondary.main;
  const secondaryLight = theme.palette.secondary.light;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await formulaireInstance.get(`/Stat/subordinates/scoreComparison/${managerId}/${year}/${phase}`);
        setData(response.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
      }
    };

    if (managerId) {
      fetchData();
    }
  }, [managerId, year, phase]);

  const chartOptions = {
    ...chartData.options,
    colors: [primary200, primaryDark, secondaryMain, secondaryLight],
    xaxis: {
      categories: data.map((item) => item.matricule),
      labels: {
        style: {
          colors: Array(data.length).fill(primary)
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: [primary]
        }
      }
    },
    grid: { borderColor: divider },
    tooltip: { theme: 'light' },
    legend: { labels: { colors: grey500 } }
  };

  const chartSeries = [
    {
      name: 'Score',
      data: data.map((item) => item.scoreData?.score || 0)
    }
  ];

  return (
    <>
      {isLoading ? (
        <SkeletonTotalGrowthBarChart />
      ) : (
        <MainCard sx={{ height: '100%' }}>
          <Grid container spacing={gridSpacing}>
            <Grid item xs={12}>
              <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
                <Grid item>
                  <Typography variant="subtitle2">Comparaison du contrat d'objectifs de vos collaborateurs directs</Typography>
                </Grid>
                <Grid item>
                  <TextField
                    id="year-input"
                    label="Année"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    variant="outlined"
                    size="small"
                    InputProps={{
                      inputProps: {
                        min: 1900,
                        max: new Date().getFullYear() + 5
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Chart options={chartOptions} series={chartSeries} type="bar" height={364} />
            </Grid>
          </Grid>
        </MainCard>
      )}
    </>
  );
};

TotalGrowthBarChart.propTypes = {
  isLoading: PropTypes.bool
};

export default TotalGrowthBarChart;
