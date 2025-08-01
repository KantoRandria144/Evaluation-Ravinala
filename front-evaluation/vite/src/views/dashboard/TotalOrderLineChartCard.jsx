import PropTypes from 'prop-types';
import React from 'react';

// Material-UI
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Third-party
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, addMonths } from 'date-fns';

// Project imports
import MainCard from 'ui-component/cards/MainCard'; // Assurez-vous que ce chemin est correct

// ==============================|| CALENDRIER - PETIT CALENDRIER ULTRA COMPACT ||============================== //

const SmallCalendarCard = ({ isLoading }) => {
  const theme = useTheme();
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  // Fonctions de navigation
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  // Calcul des dates
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const startWeek = startOfWeek(startDate, { weekStartsOn: 1 }); // Semaine commence le lundi

  const dates = [];
  for (let i = 0; i < 42; i++) {
    // 6 semaines pour couvrir tous les jours
    dates.push(addDays(startWeek, i));
  }

  // Jours de la semaine
  const daysOfWeek = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  return (
    <MainCard border={false} content={false} sx={{ maxWidth: 420, padding: 1 }}>
      <Box sx={{ p: 0.8 }}>
        {isLoading ? (
          <Typography variant="caption">Chargement...</Typography>
        ) : (
          <Grid container direction="column" spacing={0.5}>
            {/* En-tête du calendrier avec navigation */}
            <Grid item>
              <Grid container alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#3f51b5' }}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <Box>
                  <IconButton onClick={handlePrevMonth} size="small" sx={{ p: 0.3 }}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={handleNextMonth} size="small" sx={{ p: 0.3 }}>
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>

            {/* Jours de la semaine */}
            <Grid item>
              <Grid container columns={7} spacing={0}>
                {daysOfWeek.map((day, index) => (
                  <Grid item xs={1} key={index}>
                    <Typography variant="caption" align="center" sx={{ fontWeight: 500, fontSize: '0.6rem' }}>
                      {day}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Dates du mois */}
            <Grid item>
              <Grid container columns={7} spacing={0.1}>
                {dates.map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();

                  return (
                    <Grid item xs={1} key={index}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: 20,
                          bgcolor: isToday
                            ? theme.palette.primary.light
                            : isCurrentMonth
                              ? theme.palette.background.paper
                              : theme.palette.grey[200], // Fond gris pour ceux encadrés
                          color: isCurrentMonth ? theme.palette.text.primary : theme.palette.grey[600], // Texte gris
                          cursor: isCurrentMonth ? 'pointer' : 'default',
                          '&:hover': {
                            bgcolor: isCurrentMonth ? theme.palette.primary.light : theme.palette.grey[300] // Légère variation au survol
                          }
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                          {format(day, 'd')}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          </Grid>
        )}
      </Box>
    </MainCard>
  );
};

SmallCalendarCard.propTypes = {
  isLoading: PropTypes.bool
};

export default SmallCalendarCard;
