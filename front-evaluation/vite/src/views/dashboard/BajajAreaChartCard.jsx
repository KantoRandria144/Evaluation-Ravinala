import React from 'react';
import { useSelector } from 'react-redux';

// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';

// third-party
import ApexCharts from 'apexcharts';
import Chart from 'react-apexcharts';

// Example chart options (adjust as needed)
const BajajAreaChartCard = ({ averageData }) => {
  const theme = useTheme();
  const orangeDark = theme.palette.secondary[800];
  const customization = useSelector((state) => state.customization);
  const { navType } = customization;

  // Transform the data for the chart
  // x-axis: years, y-axis: averageScores
  const years = averageData.map(d => d.year);
  const scores = averageData.map(d => d.averageScore);

  const chartOptions = {
    chart: {
      id: 'support-chart',
      type: 'line',
      height: 350,
      toolbar: {
        show: false
      }
    },
    xaxis: {
      categories: years,
      labels: {
        style: {
          colors: [theme.palette.text.secondary]
        }
      }
    },
    yaxis: {
      labels: {
        show: false
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    grid: {
      show: false // Cette option masque toutes les lignes de grille.
    },
    colors: [orangeDark],
    tooltip: { theme: 'light' }
  };
  
  

  const chartSeries = [
    {
      name: 'Average Score',
      data: scores
    }
  ];

  React.useEffect(() => {
    const newSupportChart = {
      ...chartOptions,
      colors: [orangeDark],
      tooltip: { theme: 'light' }
    };
    ApexCharts.exec(`support-chart`, 'updateOptions', newSupportChart);
  }, [navType, orangeDark, chartOptions]);

  return (
    <Card sx={{ bgcolor: 'secondary.light' }}>
      <Grid container sx={{ p: 4, pb: 0, color: '#fff' }}>
      </Grid>
      <Chart options={chartOptions} series={chartSeries} type="line" height={350} />
    </Card>
  );
};

export default BajajAreaChartCard;
