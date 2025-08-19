import React, { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  TablePagination,
  Snackbar
} from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import AuditService from 'services/AuditService';
import { formulaireInstance } from '../../../axiosConfig';

function ListeLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canViewLogs, setCanViewLogs] = useState(false); // État pour la permission
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' }); // Snackbar pour notifications
  const VIEW_LOGS = 33; 

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Vérification des permissions
  const checkPermissions = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user')) || {};
      const userId = user.id;

      const response = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${VIEW_LOGS}`
      );
      setCanViewLogs(response.data.hasAccess);
    } catch (error) {
      console.error('Erreur lors de la vérification des autorisations :', error);
      setCanViewLogs(false);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la vérification des autorisations.',
        severity: 'error'
      });
    }
  };

  // Chargement des logs
  const fetchLogs = async () => {
    try {
      const data = await AuditService.getAllLogs();
      setLogs(data);

      // Log audit pour la consultation des logs
      const user = JSON.parse(localStorage.getItem('user')) || {};
      const userId = user.id;
      await AuditService.logAction(
        userId,
        'Consultation de la liste des logs',
        'Fetch',
        'AuditLogs'
      );
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des logs.');
    } finally {
      setLoading(false);
    }
  };

  // Exécuter la vérification des permissions et le chargement des logs au montage
  useEffect(() => {
    const initialize = async () => {
      await checkPermissions();
      if (canViewLogs) {
        await fetchLogs();
      } else {
        setLoading(false); // Arrêter le chargement si pas d'autorisation
      }
    };
    initialize();
  }, [canViewLogs]);

  // Gestion de la pagination
  const handleChangePage = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  // Calcul des logs à afficher pour la page courante
  const indexOfLastLog = (currentPage + 1) * rowsPerPage;
  const indexOfFirstLog = indexOfLastLog - rowsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);

  // Fonction pour formater les valeurs JSON
  const formatJsonValues = (values) => {
    if (!values) return '-';
    try {
      const parsed = JSON.parse(values);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return values;
    }
  };

  // Fermer le Snackbar
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Paper>
      <MainCard>
        {/* Header */}
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="subtitle2">Audit</Typography>
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des Logs
            </Typography>
          </Grid>
        </Grid>
      </MainCard>

      {/* Content */}
      <Box sx={{ padding: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : !canViewLogs ? (
          <Alert severity="error">
            Vous n'avez pas l'autorisation de consulter les logs.
          </Alert>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : logs.length === 0 ? (
          <Alert severity="info">Aucun log trouvé.</Alert>
        ) : (
          <>
            {/* Tableau des logs */}
            <TableContainer component="div">
              <Table
                aria-label="logs table"
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px'
                }}
              >
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Utilisateur
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Action
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Table
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Record ID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Anciennes Valeurs
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Nouvelles Valeurs
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px' }}>
                      Date
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentLogs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                        {log.userName}
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                        {log.action}
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                        {log.tableName || '-'}
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                        {log.recordId || '-'}
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0', maxWidth: '200px' }}>
                        <Box
                          component="pre"
                          sx={{
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0,
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatJsonValues(log.oldValues)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0', maxWidth: '200px' }}>
                        <Box
                          component="pre"
                          sx={{
                            fontSize: '0.75rem',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0,
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatJsonValues(log.newValues)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              labelRowsPerPage="Lignes par page :"
              rowsPerPageOptions={[5, 10, 25, 50]}
              count={logs.length}
              rowsPerPage={rowsPerPage}
              page={currentPage}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </Box>

      {/* Snackbar pour notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Paper>
  );
}

export default ListeLogs;