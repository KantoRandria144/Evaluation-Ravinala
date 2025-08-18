import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import EarningCard from './CountCollab';
// import PopularCard from './PopularCard';
// import TotalOrderLineChartCard from './TotalOrderLineChartCard';
import TotalIncomeDarkCard from './CountCadre';
import TotalIncomeLightCard from './CountNonCadre';
import CountDept from './Countdept';
import StatType from './StatType';
import StatDepartement from './StatDepartement';
import ResultSummary  from './ResultSummary';

import { gridSpacing } from 'store/constant';

// assets
import StorefrontTwoToneIcon from '@mui/icons-material/StorefrontTwoTone';
import ResultSummaryNonCadre from './ResultSummaryNonCadre';
import AuditService from '../../../services/AuditService';

// ==============================|| DEFAULT DASHBOARD ||============================== //

const Dashboard = () => {
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    // Audit logging
    const logAuditAction = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const userId = user.id;
        await AuditService.logAction(
          userId,
          'Consultation du tableau de bord des statistiques des collaborateurs',
          'Users',
          null
        );
      } catch (error) {
        console.error('Error logging audit action:', error);
      }
    };

    logAuditAction();
    setLoading(false);
  }, []);

  return (
    <Grid container spacing={gridSpacing}>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing} alignItems="stretch">
          {/* EarningCard */}
          <Grid item lg={4} md={4} sm={4} xs={12}>
            <EarningCard isLoading={isLoading} />
          </Grid>

          {/* Total Income Cards (Dark and Light) côte à côte */}
          <Grid item lg={8} md={8} sm={8} xs={12}>
            <Grid container spacing={gridSpacing} alignItems="stretch">
              <Grid item sm={6} xs={12} md={6} lg={6} style={{ height: '100%' }}>
                <TotalIncomeDarkCard isLoading={isLoading} style={{ height: '100%' }} />
              </Grid>
              <Grid item sm={6} xs={12} md={6} lg={6} style={{ height: '100%' }}>
                <TotalIncomeLightCard
                  {...{
                    isLoading: isLoading,
                    total: 203,
                    label: 'Total Income',
                    icon: <StorefrontTwoToneIcon fontSize="inherit" />,
                    style: { height: '100%' }
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12} md={12}>
            <StatType isLoading={isLoading} />
          </Grid>
          {/* <Grid item xs={12} md={4}>
            <CountDept isLoading={isLoading} />
          </Grid> */}
          {/* <Grid item xs={12} md={4}>
            <PopularCard isLoading={isLoading} />
          </Grid> */}
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12} md={12}>
            <StatDepartement isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12} md={12}>
            <ResultSummary isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12} md={12}>
            <ResultSummaryNonCadre isLoading={isLoading} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Dashboard;
