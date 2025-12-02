import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Button,
  CircularProgress,
  IconButton,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import BarChartIcon from '@mui/icons-material/BarChart';
import FlagIcon from '@mui/icons-material/Flag';
import { authInstance, formulaireInstance } from '../../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ArchiveIcon from '@mui/icons-material/Archive';

const Subordonne = () => {
  const [subordinates, setSubordinates] = useState([]);
  const [currentPeriodNonCadre, setCurrentPeriodNonCadre] = useState('');
  const [currentPeriodCadre, setCurrentPeriodCadre] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;

  const navigate = useNavigate();

  const SUBORDINATE_TYPE_TO_HABILITATION_ID = {
    Cadre: 16,
    NonCadre: 20
  };

  const [canViewArchive, setCanViewArchive] = useState(false);
  const VIEW_ARCHIVE = 26;

  const [filterName, setFilterName] = useState('');
  const [filterMatricule, setFilterMatricule] = useState('');
  const [filterTypeUser, setFilterTypeUser] = useState('');

  const checkPermissionForSubordinateType = async (userId, subordinateType) => {
    const requiredHabilitationId = SUBORDINATE_TYPE_TO_HABILITATION_ID[subordinateType];

    if (!requiredHabilitationId) {
      console.error(`Aucun identifiant d'habilitation trouvé pour le type de subordonné : ${subordinateType}`);
      return false;
    }

    try {
      const response = await formulaireInstance.get('/Periode/test-authorization', {
        params: {
          userId,
          requiredHabilitationAdminId: requiredHabilitationId
        }
      });
      return response.data.hasAccess;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'autorisation :", error);
      return false;
    }
  };

  const checkPermission = async (userId, habilitationId) => {
    if (!habilitationId) {
      console.error(`Aucun identifiant d'habilitation fourni : ${habilitationId}`);
      return false;
    }

    try {
      const response = await formulaireInstance.get('/Periode/test-authorization', {
        params: {
          userId,
          requiredHabilitationAdminId: habilitationId
        }
      });
      return response.data.hasAccess;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'autorisation :", error);
      return false;
    }
  };

  useEffect(() => {
    const fetchSubordinates = async () => {
      try {
        const response = await authInstance.get('/User/user/subordonates', {
          params: { superiorId: userId }
        });
        setSubordinates(response.data);

        const periodNonCadre = await formulaireInstance.get('/Periode/periodeActel', {
          params: { type: 'NonCadre' }
        });
        if (periodNonCadre.data.length > 0) {
          setCurrentPeriodNonCadre(periodNonCadre.data[0].currentPeriod);
        }

        const periodCadre = await formulaireInstance.get('/Periode/periodeActel', {
          params: { type: 'Cadre' }
        });
        if (periodCadre.data.length > 0) {
          setCurrentPeriodCadre(periodCadre.data[0].currentPeriod);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubordinates();
  }, [userId]);

  useEffect(() => {
    const fetchPermissions = async () => {
      setLoadingPermissions(true);

      const permissionsMap = {};
      const user = JSON.parse(localStorage.getItem('user')) || {};
      const userId = user.id;

      try {
        for (const subordinate of subordinates) {
          const hasPermission = await checkPermissionForSubordinateType(userId, subordinate.typeUser);
          permissionsMap[subordinate.id] = hasPermission;
        }

        const canView = await checkPermission(userId, VIEW_ARCHIVE);
        setCanViewArchive(canView);

        setPermissions(permissionsMap);
      } catch (error) {
        console.error('Erreur lors de la récupération des permissions :', error);
      } finally {
        setLoadingPermissions(false);
      }
    };

    if (subordinates.length > 0) {
      fetchPermissions();
    } else {
      setLoadingPermissions(false);
    }
  }, [subordinates, userId]);

  const handleFlagClick = (subordinateId, typeUser) => {
    if (typeUser === 'Cadre') {
      navigate(`/manager/evaluationCadre/${subordinateId}/${typeUser}`);
    } else if (typeUser === 'NonCadre') {
      navigate(`/manager/evaluationNonCadre/${subordinateId}/${typeUser}`);
    }
  };

  const filteredSubordinates = useMemo(() => {
    return subordinates.filter((subordinate) => {
      const matchesName = filterName ? subordinate.name.toLowerCase().includes(filterName.toLowerCase()) : true;
      const matchesMatricule = filterMatricule ? subordinate.matricule.toLowerCase().includes(filterMatricule.toLowerCase()) : true;
      const matchesTypeUser = filterTypeUser ? subordinate.typeUser === filterTypeUser : true;
      return matchesName && matchesMatricule && matchesTypeUser;
    });
  }, [subordinates, filterName, filterMatricule, filterTypeUser]);

  const uniqueTypeUsers = useMemo(() => {
    return [...new Set(subordinates.map((s) => s.typeUser))];
  }, [subordinates]);

  return (
    <>
      <Paper>
        <MainCard>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="subtitle2">Période</Typography>
              <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
                Liste des périodes d'évaluation
              </Typography>
            </Grid>
          </Grid>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" align="center">
              {error}
            </Typography>
          ) : (
            <>
              <Box sx={{ mt: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="Nom"
                      variant="outlined"
                      fullWidth
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <TextField
                      label="Matricule"
                      variant="outlined"
                      fullWidth
                      value={filterMatricule}
                      onChange={(e) => setFilterMatricule(e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth>
                      <InputLabel id="filter-typeUser-label">Type d'Utilisateur</InputLabel>
                      <Select
                        labelId="filter-typeUser-label"
                        id="filter-typeUser"
                        value={filterTypeUser}
                        label="Type d'Utilisateur"
                        onChange={(e) => setFilterTypeUser(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>Tous</em>
                        </MenuItem>
                        {uniqueTypeUsers.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
              
              <Grid container spacing={2} mt={2}>
                {filteredSubordinates.length === 0 ? (
                  <Grid item xs={12}>
                    <MainCard>
                      <Alert severity="warning">Aucun collaborateur trouvé avec les critères sélectionnés</Alert>
                    </MainCard>
                  </Grid>
                ) : (
                  filteredSubordinates.map((subordinate) => (
                    <Grid item xs={12} sm={6} md={4} key={subordinate.id}>
                      <Paper
                        sx={{
                          p: 3,
                          backgroundColor: '#fff',
                          textAlign: 'left',
                          position: 'relative',
                          border: '1px solid rgb(227, 232, 239)'
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            padding: 2,
                            maxWidth: 500,
                            margin: '0 auto'
                          }}
                        >
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              borderRadius: '50%',
                              backgroundColor: '#90caf9',
                              color: '#4459b4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem',
                              fontWeight: 'bold',
                              flexShrink: 0
                            }}
                          >
                            {subordinate.name.charAt(0).toUpperCase()}
                          </Box>

                          <Box sx={{ ml: 5 }}>
                            <Typography variant="h6" sx={{ fontWeight: '600' }}>
                              {subordinate.name}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: '600' }}>
                              {subordinate.matricule}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#757575' }}>
                              {subordinate.typeUser}
                            </Typography>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 1,
                            mt: 2,
                            width: '100%'
                          }}
                        >
                          <Tooltip title="Statistiques" arrow>
                            <IconButton
                              onClick={() => {
                                if (subordinate.typeUser === 'Cadre') {
                                  navigate(`/stat/cadre/index/${subordinate.id}/${subordinate.typeUser}`);
                                } else if (subordinate.typeUser === 'NonCadre') {
                                  navigate(`/stat/nonCadre/index/${subordinate.id}/${subordinate.typeUser}`);
                                } else {
                                  console.error("Type d'utilisateur invalide:", subordinate.typeUser);
                                }
                              }}
                              sx={{
                                backgroundColor: '#e8eaf6',
                                color: '#283593',
                                '&:hover': {
                                  backgroundColor: '#e8eaf6'
                                },
                                boxShadow: 'none',
                                borderRadius: '6px',
                                padding: 0.5,
                                transition: 'background-color 0.3s',
                                flexGrow: 1,
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              aria-label="Statistiques"
                              size="small"
                            >
                              <BarChartIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {permissions[subordinate.id] && (
                            <Tooltip title="Évaluation" arrow>
                              <IconButton
                                onClick={() => handleFlagClick(subordinate.id, subordinate.typeUser)}
                                sx={{
                                  backgroundColor: '#e8f2dc',
                                  color: '#6baa1e',
                                  '&:hover': {
                                    backgroundColor: '#e8f2dc'
                                  },
                                  boxShadow: 'none',
                                  borderRadius: '6px',
                                  padding: 0.5,
                                  transition: 'background-color 0.3s',
                                  flexGrow: 1,
                                  height: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                aria-label="Évaluation"
                                size="small"
                              >
                                <RateReviewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {canViewArchive && (
                            <Tooltip title="Résultat" arrow>
                              <IconButton
                                onClick={() => {
                                  if (subordinate.typeUser === 'Cadre') {
                                    navigate(`/allEvaluation/cadreYear/${subordinate.id}/${subordinate.typeUser}`);
                                  } else if (subordinate.typeUser === 'NonCadre') {
                                    navigate(`/allEvaluation/nonCadreYear/${subordinate.id}/${subordinate.typeUser}`);
                                  } else {
                                    console.error("Type d'utilisateur invalide:", subordinate.typeUser);
                                  }
                                }}
                                sx={{
                                  backgroundColor: '#fff5cc',
                                  color: '#b07b00',
                                  '&:hover': {
                                    backgroundColor: '#fff5cc'
                                  },
                                  boxShadow: 'none',
                                  borderRadius: '6px',
                                  padding: 0.5,
                                  transition: 'background-color 0.3s',
                                  flexGrow: 1,
                                  height: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                aria-label="Archive"
                                size="small"
                              >
                                <ArchiveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  ))
                )}
              </Grid>
            </>
          )}
        </MainCard>
      </Paper>
    </>
  );
};

export default Subordonne;