import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Paper,
  Alert,
  Box,
  Button,
  TextField // <-- Import TextField
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MainCard from 'ui-component/cards/MainCard';
import { formulaireInstance } from '../../../../../axiosConfig';
import { useNavigate, useParams } from 'react-router-dom';

function AllCadreYear() {
  const [evaluationsByYear, setEvaluationsByYear] = useState([]);
  const { userId, typeUser } = useParams();
  const userType = typeUser;

  // Pagination
  const [visibleUsers, setVisibleUsers] = useState(9);
  const yearPerPage = 9;

  // Filtre par année
  const [yearFilter, setYearFilter] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const response = await formulaireInstance.get(`/archive/years/${userId}/${userType}`);
        if (response && response.data) {
          setEvaluationsByYear(response.data);
        } else {
          console.error('Unexpected response structure:', response);
        }
      } catch (error) {
        console.error('Error fetching evaluations:', error);
      }
    };

    if (userId) {
      fetchEvaluations();
    }
  }, [userId, userType]);

  const handleEvaluationClick = (evalId) => {
    navigate(`/allEvaluation/cadreArchive/${userId}/${evalId}`);
  };

  const handleLoadMore = () => {
    setVisibleUsers((prevVisibleUsers) => prevVisibleUsers + yearPerPage);
  };

  // Filtrage par année
  const filteredEvaluations = evaluationsByYear.filter((evaluation) => {
    // On transforme l'année en chaîne de caractères pour appliquer includes().
    return evaluation.evalAnnee.toString().includes(yearFilter.trim());
  });

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="subtitle2">Résultat</Typography>
            <Typography variant="h3" sx={{ marginTop: '0.5rem' }}>
              Liste des évaluations
            </Typography>
          </Grid>
        </Grid>

        {/* Champ de filtre par année */}
        <Box sx={{ mb: 3 }}>
          <TextField
            label="Rechercher par année"
            variant="outlined"
            size="small"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
        </Box>

        {filteredEvaluations.length === 0 ? (
          <Alert severity="warning">Aucune archive disponible</Alert>
        ) : (
          <>
            <Grid container spacing={3}>
              {filteredEvaluations.slice(0, visibleUsers).map((evaluation) => (
                <Grid item xs={12} sm={6} md={4} key={evaluation.evalId}>
                  <Card
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 20px',
                      backgroundColor: '#E8EAF6',
                      '&:hover': {
                        backgroundColor: '#e3eaf5',
                        cursor: 'pointer'
                      }
                    }}
                    onClick={() => handleEvaluationClick(evaluation.evalId)}
                  >
                    <FolderIcon sx={{ fontSize: 24, color: 'rgb(57, 73, 171)', marginRight: '16px' }} />
                    <CardContent sx={{ flexGrow: 1, padding: 0 }}>
                      <Typography variant="body1" sx={{ color: '#1a202c' }}>
                        {evaluation.evalAnnee}
                      </Typography>
                    </CardContent>
                    <IconButton>
                      {/* <MoreVertIcon sx={{ fontSize: 20, color: '#757575' }} /> */}
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {visibleUsers < filteredEvaluations.length && (
              <Box sx={{ textAlign: 'left', mt: 3 }}>
                <Button onClick={handleLoadMore}>Voir plus</Button>
              </Box>
            )}
          </>
        )}
      </MainCard>
    </Paper>
  );
}

export default AllCadreYear;
