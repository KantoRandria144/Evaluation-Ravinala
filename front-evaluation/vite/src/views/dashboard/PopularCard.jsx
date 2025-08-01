// import PropTypes from 'prop-types';
// import React from 'react';
// import { formulaireInstance } from '../../axiosConfig';

// // material-ui
// import Avatar from '@mui/material/Avatar';
// import Button from '@mui/material/Button';
// import CardActions from '@mui/material/CardActions';
// import CardContent from '@mui/material/CardContent';
// import Divider from '@mui/material/Divider';
// import Grid from '@mui/material/Grid';
// import Typography from '@mui/material/Typography';

// // project imports
// import BajajAreaChartCard from './BajajAreaChartCard';
// import MainCard from 'ui-component/cards/MainCard';
// import SkeletonPopularCard from 'ui-component/cards/Skeleton/PopularCard';
// import { gridSpacing } from 'store/constant';

// // assets
// import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
// import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
// import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';

// const PopularCard = ({ isLoading }) => {
//   const [data, setData] = React.useState(null);
//   const [loading, setLoading] = React.useState(true);

//   const user = JSON.parse(localStorage.getItem('user')) || {};
//   const managerId = user.id;

//   const phase = 'Évaluation Finale';

//   React.useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await formulaireInstance.get(`/Stat/subordinates/averageScoresByYear/${managerId}/${encodeURIComponent(phase)}`);
//         // La réponse est présumée OK si aucun catch n’est survenu
//         const result = response.data;
//         setData(result);
//       } catch (error) {
//         console.error('Erreur lors de la récupération des scores moyens:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [managerId, phase]);

//   // Pendant le chargement, on affiche le Skeleton
//   if (isLoading || loading) {
//     return <SkeletonPopularCard />;
//   }

//   if (!data || !data.averageScoresByYear || data.averageScoresByYear.length === 0) {
//     return (
//       <MainCard content={false}>
//         <CardContent>
//           <Typography variant="h6">Aucune donnée disponible</Typography>
//         </CardContent>
//       </MainCard>
//     );
//   }

//   const sortedData = [...data.averageScoresByYear].sort((a, b) => a.year - b.year);

//   const rows = sortedData.map((item, index) => {
//     const previousScore = index > 0 ? sortedData[index - 1].averageScore : null;
//     let trendingUp = null;
//     if (previousScore !== null) {
//       trendingUp = item.averageScore >= previousScore;
//     }

//     return (
//       <React.Fragment key={item.year}>
//         <Grid container direction="column">
//           <Grid item>
//             <Grid container alignItems="center" justifyContent="space-between">
//               <Grid item>
//                 <Typography variant="subtitle1" color="inherit">
//                   {item.year}
//                 </Typography>
//               </Grid>
//               <Grid item>
//                 <Grid container alignItems="center" justifyContent="space-between">
//                   <Grid item>
//                     <Typography variant="subtitle1" color="inherit">
//                       {item.averageScore.toFixed(2)} %
//                     </Typography>
//                   </Grid>
//                   {/* On retire la condition previousScore !== null pour tester */}
//                   <Grid item>
//                     {item.averageScore < 50 ? (
//                       <Avatar
//                         variant="rounded"
//                         sx={{
//                           width: 16,
//                           height: 16,
//                           borderRadius: '5px',
//                           bgcolor: '#ff0000', // Rouge vif
//                           color: '#ffffff', // Texte blanc
//                           ml: 2
//                         }}
//                       >
//                         <KeyboardArrowDownOutlinedIcon fontSize="small" />
//                       </Avatar>
//                     ) : (
//                       <Avatar
//                         variant="rounded"
//                         sx={{
//                           width: 16,
//                           height: 16,
//                           borderRadius: '5px',
//                           bgcolor: '#00ff00', // Vert vif
//                           color: '#000000', // Texte noir
//                           ml: 2
//                         }}
//                       >
//                         <KeyboardArrowUpOutlinedIcon fontSize="small" />
//                       </Avatar>
//                     )}
//                   </Grid>
//                 </Grid>
//               </Grid>
//             </Grid>
//           </Grid>
//         </Grid>
//         <Divider sx={{ my: 1.5 }} />
//       </React.Fragment>
//     );
//   });

//   return (
//     <MainCard content={false}>
//       <CardContent>
//         <Grid container spacing={gridSpacing}>
//           <Grid item xs={12}>
//             <Typography variant="h6">Moyenne des contrats d'objectifs annuel</Typography>
//           </Grid>
//           <Grid item xs={12} sx={{ pt: '16px !important' }}>
//             {/* Pass the chart data to BajajAreaChartCard */}
//             <BajajAreaChartCard averageData={data.averageScoresByYear} />
//           </Grid>
//         </Grid>
//       </CardContent>
//     </MainCard>
//   );
// };

// PopularCard.propTypes = {
//   isLoading: PropTypes.bool,
//   managerId: PropTypes.string.isRequired,
//   phase: PropTypes.string.isRequired
// };

// export default PopularCard;

import PropTypes from 'prop-types';
import React from 'react';
import { formulaireInstance } from '../../axiosConfig';

// Material-UI
import Avatar from '@mui/material/Avatar';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box';

// Project Imports
import BajajAreaChartCard from './BajajAreaChartCard';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonPopularCard from 'ui-component/cards/Skeleton/PopularCard';
import { gridSpacing } from 'store/constant';

// Assets
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';

const PopularCard = ({ isLoading }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [startYear, setStartYear] = React.useState('');
  const [endYear, setEndYear] = React.useState('');
  const [filterEnabled, setFilterEnabled] = React.useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || {};
  const managerId = user.id;

  const phase = 'Évaluation Finale';

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await formulaireInstance.get(`/Stat/subordinates/averageScoresByYear/${managerId}/${encodeURIComponent(phase)}`);
        const result = response.data;
        setData(result);

        // Initialisation des années de début et de fin
        if (result.averageScoresByYear && result.averageScoresByYear.length > 0) {
          const years = result.averageScoresByYear.map(item => item.year);
          setStartYear(Math.min(...years));
          setEndYear(Math.max(...years));
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des scores moyens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [managerId, phase]);

  // Pendant le chargement, on affiche le Skeleton
  if (isLoading || loading) {
    return <SkeletonPopularCard />;
  }

  if (!data || !data.averageScoresByYear || data.averageScoresByYear.length === 0) {
    return (
      <MainCard content={false} sx={{ height: '100%' }}> {/* Ajout de height: '100%' */}
        <CardContent>
          <Typography variant="h6">Aucune donnée disponible</Typography>
        </CardContent>
      </MainCard>
    );
  }

  // Trier les données par année
  const sortedData = [...data.averageScoresByYear].sort((a, b) => a.year - b.year);

  const years = data.averageScoresByYear.map(item => item.year);
  const uniqueYears = [...new Set(years)].sort((a, b) => a - b);

  // Gestion des changements de sélecteurs
  const handleStartYearChange = (event) => {
    const selectedStartYear = event.target.value;
    setStartYear(selectedStartYear);
    // Assurer que endYear est toujours >= startYear
    if (selectedStartYear > endYear) {
      setEndYear(selectedStartYear);
    }
  };

  const handleEndYearChange = (event) => {
    const selectedEndYear = event.target.value;
    setEndYear(selectedEndYear);
    // Assurer que startYear est toujours <= endYear
    if (selectedEndYear < startYear) {
      setStartYear(selectedEndYear);
    }
  };

  // Filtrer les données si le filtre est activé
  const filteredData = filterEnabled
    ? sortedData.filter(item => item.year >= startYear && item.year <= endYear)
    : sortedData;

  // Afficher un message si aucune donnée n'est disponible pour la période sélectionnée
  if (filterEnabled && filteredData.length === 0) {
    return (
      <MainCard content={false} sx={{ height: '100%' }}> {/* Ajout de height: '100%' */}
        <CardContent>
          <Typography variant="h6">Aucune donnée disponible pour la période sélectionnée</Typography>
        </CardContent>
      </MainCard>
    );
  }

  const rows = filteredData.map((item, index) => {
    const previousScore = index > 0 ? filteredData[index - 1].averageScore : null;
    let trendingUp = null;
    if (previousScore !== null) {
      trendingUp = item.averageScore >= previousScore;
    }

    return (
      <React.Fragment key={item.year}>
        <Grid container direction="column">
          <Grid item>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="body2" color="inherit" sx={{ lineHeight: 1 }}>
                  {item.year}
                </Typography>
              </Grid>
              <Grid item>
                <Grid container alignItems="center" justifyContent="space-between">
                  <Grid item>
                    <Typography variant="body2" color="inherit" sx={{ lineHeight: 1 }}>
                      {item.averageScore.toFixed(2)} %
                    </Typography>
                  </Grid>
                  <Grid item>
                    {item.averageScore < 50 ? (
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '5px',
                          bgcolor: '#ff0000', // Rouge vif
                          color: '#ffffff', // Texte blanc
                          ml: 1 // Réduit de 2 à 1
                        }}
                      >
                        <KeyboardArrowDownOutlinedIcon fontSize="small" />
                      </Avatar>
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '5px',
                          bgcolor: '#00ff00', // Vert vif
                          color: '#000000', // Texte noir
                          ml: 1 // Réduit de 2 à 1
                        }}
                      >
                        <KeyboardArrowUpOutlinedIcon fontSize="small" />
                      </Avatar>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Divider sx={{ my: 0.75 }} /> {/* Réduit de 1.5 à 0.75 */}
      </React.Fragment>
    );
  });

  return (
    <MainCard content={false} sx={{ height: '100%' }}> {/* Ajout de height: '100%' */}
      <CardContent sx={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}> {/* Ajout de flex et height */}
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12}>
            <Typography variant="h6">Moyenne des contrats d'objectifs annuel</Typography>
          </Grid>

          {/* Commutateur pour activer/désactiver le filtre */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={filterEnabled}
                  onChange={(e) => setFilterEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="Filtrer par plage d'années"
            />
          </Grid>

          {/* Sélecteurs d'années visibles seulement si le filtre est activé */}
          {filterEnabled && (
            <>
              <Grid item xs={12} sm={6} md={6} sx={{ display: 'flex', alignItems: 'stretch' }}>
                <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'column' }}>
                  <InputLabel id="start-year-label">Année de début</InputLabel>
                  <Select
                    labelId="start-year-label"
                    id="start-year-select"
                    value={startYear}
                    label="Année de début"
                    onChange={handleStartYearChange}
                    sx={{ flexGrow: 1 }}
                  >
                    {uniqueYears.map(year => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={6} sx={{ display: 'flex', alignItems: 'stretch' }}>
                <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'column' }}>
                  <InputLabel id="end-year-label">Année de fin</InputLabel>
                  <Select
                    labelId="end-year-label"
                    id="end-year-select"
                    value={endYear}
                    label="Année de fin"
                    onChange={handleEndYearChange}
                    sx={{ flexGrow: 1 }}
                  >
                    {uniqueYears.map(year => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Graphique */}
          <Grid item xs={12} sx={{ flexGrow: 1 }}>
            {/* Passer les données filtrées au graphique */}
            <BajajAreaChartCard averageData={filteredData} />
          </Grid>
        </Grid>
      </CardContent>
    </MainCard>
  );
};

PopularCard.propTypes = {
  isLoading: PropTypes.bool,
  // managerId et phase ne sont plus requis en tant que props car ils sont obtenus localement
};

export default PopularCard;

