import PropTypes from 'prop-types';
import React from 'react';
import { authInstance } from '../../../axiosConfig';

// material-ui
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SkeletonPopularCard from 'ui-component/cards/Skeleton/PopularCard';
import { gridSpacing } from 'store/constant';

// assets
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';

const PopularCard = ({ isLoading }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authInstance.get('/Statuser/user/countByDepartment');
        const result = response.data;
        setData(result);
      } catch (error) {
        console.error('Erreur lors de la récupération des scores moyens:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);  // Pas de dépendances supplémentaires

  // Pendant le chargement, on affiche le Skeleton
  if (isLoading || loading) {
    return <SkeletonPopularCard />;
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <MainCard content={false}>
        <CardContent>
          <Typography variant="h6">Aucune donnée disponible</Typography>
        </CardContent>
      </MainCard>
    );
  }

  const rows = Object.keys(data).map((department) => {
    const departmentValue = data[department];
    let trendingIcon = null;
    let trendingColor = '#ff0000'; // Default red color for values under 50

    if (departmentValue >= 50) {
      trendingIcon = <KeyboardArrowUpOutlinedIcon fontSize="small" />;
      trendingColor = '#00ff00'; // Green for values 50 and above
    } else if (departmentValue < 50) {
      trendingIcon = <KeyboardArrowDownOutlinedIcon fontSize="small" />;
      trendingColor = '#ff0000'; // Red for values below 50
    }

    return (
      <React.Fragment key={department}>
        <Grid container direction="column">
          <Grid item>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="subtitle1" color="inherit">
                  {department || "Unknown Department"}
                </Typography>
              </Grid>
              <Grid item>
                <Grid container alignItems="center" justifyContent="space-between">
                  <Grid item>
                    <Typography variant="subtitle1" color="inherit">
                      {departmentValue}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Avatar
                      variant="rounded"
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '5px',
                        bgcolor: trendingColor,
                        color: '#ffffff',
                        ml: 2
                      }}
                    >
                      {trendingIcon}
                    </Avatar>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Divider sx={{ my: 1.5 }} />
      </React.Fragment>
    );
  });

  return (
    <MainCard content={false}>
      <CardContent>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12}>
            <Typography variant="h6">Statistiques par département</Typography>
          </Grid>
          <Grid item xs={12}>
            {rows}
          </Grid>
        </Grid>
      </CardContent>
      <CardActions sx={{ p: 1.25, pt: 0, justifyContent: 'center' }}>
        <Button size="small" disableElevation>
          View All
          <ChevronRightOutlinedIcon />
        </Button>
      </CardActions>
    </MainCard>
  );
};

PopularCard.propTypes = {
  isLoading: PropTypes.bool
};

export default PopularCard;
