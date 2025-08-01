// ==============================|| DASHBOARD - TOTAL GROWTH BAR CHART ||============================== //

const chartData = {
  height: 480,
  type: 'bar',
  options: {
    chart: {
      id: 'bar-chart',
      stacked: true,
      toolbar: {
        show: true
      },
      zoom: {
        enabled: true
      }
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: {
            position: 'bottom',
            offsetX: -10,
            offsetY: 0
          }
        }
      }
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%'
      }
    },
    xaxis: {
      type: 'category',
      categories: [] // Les catégories seront mises à jour dynamiquement
    },
    yaxis: {
      labels: {
        style: {
          colors: [] // Les couleurs seront mises à jour dynamiquement
        }
      }
    },
    legend: {
      show: true,
      fontFamily: `'Roboto', sans-serif`,
      position: 'bottom',
      offsetX: 20,
      labels: {
        useSeriesColors: false
      },
      markers: {
        width: 16,
        height: 16,
        radius: 5
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    fill: {
      type: 'solid'
    },
    tooltip: {
      theme: 'light'
    },
    dataLabels: {
      enabled: false
    },
    grid: {
      show: true,
      borderColor: '' // La couleur de la bordure sera mise à jour dynamiquement
    }
  },
  series: [
    {
      name: 'Score',
      data: [] // Les données seront mises à jour dynamiquement
    }
  ]
};

export default chartData;
