import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import EarningCard from './EarningCard';
import PopularCard from './PopularCard';
import TotalOrderLineChartCard from './TotalOrderLineChartCard';
import TotalIncomeDarkCard from './TotalIncomeDarkCard';
import TotalIncomeLightCard from './TotalIncomeLightCard';
import TotalGrowthBarChart from './TotalGrowthBarChart';

import { gridSpacing } from 'store/constant';
import MainCard from 'ui-component/cards/MainCard';
import ScoreCadre from './ContratObjectivCadre';
import ScoreNonCadre from './ContratObjectivNonCadre';

// assets
import StorefrontTwoToneIcon from '@mui/icons-material/StorefrontTwoTone';
import AuditService from '../../services/AuditService';

// ==============================|| DEFAULT DASHBOARD ||============================== //

const Dashboard = () => {
  const [isLoading, setLoading] = useState(true);

  const phase = 'Évaluation Finale';
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;
  const userType = user.typeUser;

  useEffect(() => {
    // Log the page consultation
    AuditService.logAction(
      userId,
      'Consultation de la page Dashboard',
      'View',
      null
    ).catch((err) => {
      console.error('Erreur lors de l\'enregistrement de l\'audit pour la consultation du Dashboard:', err);
    });

    setLoading(false);
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item lg={4} md={6} sm={6} xs={12}>
            <EarningCard isLoading={isLoading} />
          </Grid>
          <Grid item lg={4} md={12} sm={12} xs={12}>
            <Grid container spacing={gridSpacing}>
              <Grid item sm={6} xs={12} md={6} lg={12}>
                <TotalIncomeDarkCard isLoading={isLoading} />
              </Grid>
              <Grid item sm={6} xs={12} md={6} lg={12}>
                <TotalIncomeLightCard
                  {...{
                    isLoading: isLoading,
                    total: 203,
                    label: 'Total Income',
                    icon: <StorefrontTwoToneIcon fontSize="inherit" />
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item lg={4} md={6} sm={6} xs={12}>
            <TotalOrderLineChartCard isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing} alignItems="stretch">
          <Grid item xs={12} md={8}>
            <TotalGrowthBarChart isLoading={isLoading} />
          </Grid>
          <Grid item xs={12} md={4}>
            <PopularCard isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Grid item xs={12} md={12} sx={{ height: '100%' }}>
            {userType === 'Cadre' ? (
              <MainCard title="Performance de votre contrat d'objectifs par année">
                <ScoreCadre userId={userId} phase={phase} />
              </MainCard>
            ) : (
              <MainCard title="Performance de votre contrat d'objectifs par année">
                <ScoreNonCadre userId={userId} phase={phase} />
              </MainCard>
            )}
          </Grid>
      </Grid>
    </Grid>
  );
};

export default Dashboard;
