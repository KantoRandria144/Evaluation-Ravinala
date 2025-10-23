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
  Snackbar,
  Button,
  Popover,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MainCard from 'ui-component/cards/MainCard';
import AuditService from 'services/AuditService';
import { formulaireInstance } from '../../../axiosConfig';

function ListeLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canViewLogs, setCanViewLogs] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [popover, setPopover] = useState({ open: false, anchorEl: null, data: null, title: '' });
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
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await checkPermissions();
      if (canViewLogs) {
        await fetchLogs();
      } else {
        setLoading(false);
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

  const indexOfLastLog = (currentPage + 1) * rowsPerPage;
  const indexOfFirstLog = indexOfLastLog - rowsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);

  // Fonction pour vérifier si les données sont vides
  const isEmptyValue = (value) => {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Object.keys(parsed).length === 0;
      } catch {
        return value.trim() === '';
      }
    }
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    return false;
  };

  // Fonction pour aplatir les objets JSON
  const flattenJson = (data, prefix = '') => {
    const result = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [{ key: prefix || 'value', value: data || '-' }];
    }

    Object.entries(data).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        const nested = flattenJson(value, newKey);
        result.push(...nested);
      } else {
        result.push({ key: newKey, value });
      }
    });
    return result;
  };

  // Fonction pour formater les noms de champs
  const formatFieldName = (fieldName) => {
    const formatted = fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/Id$/, ' ID')
      .replace(/Url/gi, 'URL')
      .replace(/Api/gi, 'API')
      .trim();
    return formatted;
  };

  // Fonction pour formater les valeurs
  const formatValue = (value, key = '') => {
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'boolean') {
      return value ? 'Oui' : 'Non';
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value).toLocaleString('fr-FR');
    }

    if (typeof value === 'number') {
      if (key.toLowerCase().includes('id')) {
        return value.toString();
      }
      if (value % 1 !== 0) {
        return value.toFixed(2);
      }
      return value.toString();
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return 'Aucun élément';

      if (value.length > 0 && value[0].templatePriorityId && value[0].name && value[0].maxObjectives !== undefined) {
        const activeCount = value.filter(item => item.isActif).length;
        const inactiveItems = value
          .filter(item => !item.isActif)
          .map(item => `${item.name} (Inactif)`);
        const activeItems = value
          .filter(item => item.isActif)
          .map(item => item.name);
        return `${value.length} priorité(s) : ${activeItems.join(', ')}${inactiveItems.length > 0 ? `, ${inactiveItems.join(', ')}` : ''} (${activeCount} active(s), ${value.length - activeCount} inactive(s))`;
      }

      return value.map((item, index) => {
        if (item.name) return item.name;
        if (item.title) return item.title;
        if (item.label) return item.label;
        if (item.description) return item.description.substring(0, 30) + (item.description.length > 30 ? '...' : '');
        if (item.priorityName) return `${item.priorityName} (${item.weighting || 0}%)`;
        if (item.id !== undefined) return `ID: ${item.id}`;
        return `Élément ${index + 1}`;
      }).join(', ');
    }

    if (typeof value === 'object') {
      if (Object.keys(value).length === 0) return 'Objet vide';

      if (value.updatedPriorities && Array.isArray(value.updatedPriorities)) {
        const priorities = value.updatedPriorities;
        const activeCount = priorities.filter(item => item.isActif).length;
        const inactiveItems = priorities
          .filter(item => !item.isActif)
          .map(item => `${item.name} (Inactif)`);
        const activeItems = priorities
          .filter(item => item.isActif)
          .map(item => item.name);
        return `${priorities.length} priorité(s) : ${activeItems.join(', ')}${inactiveItems.length > 0 ? `, ${inactiveItems.join(', ')}` : ''} (${activeCount} active(s), ${priorities.length - activeCount} inactive(s))`;
      }

      if (value.name) return value.name;
      if (value.label) return value.label;
      if (value.title) return value.title;
      if (value.sectionName) return value.sectionName;
      if (value.description) return value.description.substring(0, 50) + (value.description.length > 50 ? '...' : '');

      return `Objet (${Object.keys(value).length} propriétés)`;
    }

    return String(value);
  };

  // Fonction pour formater les valeurs complexes
  const formatComplexValue = (value, key = '') => {
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        return value;
      }
    }

    if (parsedValue && typeof parsedValue === 'object' && parsedValue.updatedPriorities && Array.isArray(parsedValue.updatedPriorities)) {
      const priorities = parsedValue.updatedPriorities;
      const activeCount = priorities.filter(item => item.isActif).length;
      const inactiveItems = priorities
        .filter(item => !item.isActif)
        .map(item => `${item.name} (Inactif)`);
      const activeItems = priorities
        .filter(item => item.isActif)
        .map(item => item.name);
      return `${priorities.length} priorité(s) : ${activeItems.join(', ')}${inactiveItems.length > 0 ? `, ${inactiveItems.join(', ')}` : ''} (${activeCount} active(s), ${priorities.length - activeCount} inactive(s))`;
    }

    if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].templatePriorityId && parsedValue[0].name) {
      const activeCount = parsedValue.filter(item => item.isActif).length;
      const inactiveItems = parsedValue
        .filter(item => !item.isActif)
        .map(item => `${item.name} (Inactif)`);
      const activeItems = parsedValue
        .filter(item => item.isActif)
        .map(item => item.name);
      return `${parsedValue.length} priorité(s) : ${activeItems.join(', ')}${inactiveItems.length > 0 ? `, ${inactiveItems.join(', ')}` : ''} (${activeCount} active(s), ${parsedValue.length - activeCount} inactive(s))`;
    }

    if (parsedValue && typeof parsedValue === 'object' && parsedValue.objectives && Array.isArray(parsedValue.objectives)) {
      const objectives = parsedValue.objectives;
      if (objectives.length > 0 && objectives[0].priorityName) {
        const priorities = [...new Set(objectives.map(obj => obj.priorityName))];
        return `${objectives.length} objectifs répartis en ${priorities.length} priorité(s): ${priorities.join(', ')}`;
      }
    }

    if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].priorityName) {
      const priorities = [...new Set(parsedValue.map(obj => obj.priorityName))];
      return `${parsedValue.length} objectifs répartis en ${priorities.length} priorité(s): ${priorities.join(', ')}`;
    }

    return formatValue(parsedValue, key);
  };

  // Fonction pour créer une vue détaillée
  const createExpandedView = (data, title) => {
    if (!data || typeof data !== 'object') return null;

    if (data.updatedPriorities && Array.isArray(data.updatedPriorities)) {
      const priorities = data.updatedPriorities;

      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>
            {title} - Vue détaillée des priorités
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nom</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Objectifs max</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {priorities.map((priority, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                      backgroundColor: !priority.isActif ? '#ffebee' : 'inherit',
                    }}
                  >
                    <TableCell>{priority.templatePriorityId || '-'}</TableCell>
                    <TableCell>{priority.name || '-'}</TableCell>
                    <TableCell>{priority.maxObjectives || 0}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-block',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          backgroundColor: priority.isActif ? '#e8f5e9' : '#ffcdd2',
                          color: priority.isActif ? '#2e7d32' : '#c62828',
                          fontWeight: 500,
                        }}
                      >
                        {priority.isActif ? 'Actif' : 'Inactif'}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }

    if (data.objectives && Array.isArray(data.objectives)) {
      const objectives = data.objectives;
      const priorityGroups = objectives.reduce((groups, obj) => {
        const priority = obj.priorityName || 'Sans priorité';
        if (!groups[priority]) {
          groups[priority] = [];
        }
        groups[priority].push(obj);
        return groups;
      }, {});

      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>
            {title} - Vue détaillée des objectifs
          </Typography>
          {Object.entries(priorityGroups).map(([priority, objs]) => (
            <Box key={priority} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>
                {priority} ({objs.length} objectif{objs.length > 1 ? 's' : ''})
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Pondération (%)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Indicateur de résultat</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Résultat</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {objs.map((obj, index) => (
                      <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                        <TableCell>{obj.description || '-'}</TableCell>
                        <TableCell>{obj.weighting || 0}%</TableCell>
                        <TableCell>{obj.resultIndicator || '-'}</TableCell>
                        <TableCell>{obj.result || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </Box>
      );
    }

    return null;
  };

  // Gérer l'ouverture du popover
  const handleOpenPopover = (event, data, title) => {
    try {
      const parsedData = data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
      setPopover({ open: true, anchorEl: null, data: parsedData, title });
    } catch {
      setSnackbar({
        open: true,
        message: 'Impossible de parser les données pour l\'affichage.',
        severity: 'error'
      });
    }
  };

  // Fermer le popover
  const handleClosePopover = () => {
    setPopover({ open: false, anchorEl: null, data: null, title: '' });
  };

  // Fermer le Snackbar
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Composant pour le tableau des détails dans le popover
  const DetailsTable = ({ data }) => {
    if (!data) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Aucune donnée disponible</Typography>
        </Box>
      );
    }

    if (Array.isArray(data) && data.length > 0 && data[0].templatePriorityId && data[0].name) {
      return createExpandedView({ updatedPriorities: data }, 'Priorités');
    }

    if (typeof data === 'object' && data.updatedPriorities && Array.isArray(data.updatedPriorities)) {
      return createExpandedView(data, 'Priorités');
    }

    if (typeof data === 'object' && data.objectives && Array.isArray(data.objectives)) {
      return createExpandedView(data, 'Objectifs');
    }

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      if (data[0].priorityName && data[0].description) {
        return createExpandedView({ objectives: data }, 'Objectifs');
      }

      const headers = Object.keys(data[0]);

      return (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {data.length} élément(s) trouvé(s)
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table aria-label="details table" size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        fontWeight: 'bold',
                        fontSize: '0.875rem',
                        backgroundColor: '#f8f9fa',
                        borderBottom: '2px solid #e0e0e0',
                      }}
                    >
                      {formatFieldName(header)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                    {headers.map((header) => (
                      <TableCell
                        key={header}
                        sx={{
                          fontSize: '0.8rem',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={String(formatComplexValue(item[header], header))}
                      >
                        {formatComplexValue(item[header], header)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }

    const flattenedData = flattenJson(data);

    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {flattenedData.length} propriété(s)
        </Typography>
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table aria-label="details table" size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #e0e0e0',
                    width: '40%',
                  }}
                >
                  Propriété
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '0.875rem',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #e0e0e0',
                  }}
                >
                  Valeur
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flattenedData.map(({ key, value }, index) => (
                <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}>
                  <TableCell
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#1976d2',
                      verticalAlign: 'top',
                    }}
                  >
                    {formatFieldName(key)}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: '0.8rem',
                      wordBreak: 'break-word',
                      maxWidth: '300px',
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        backgroundColor: typeof value === 'object' ? '#f5f5f5' : 'transparent',
                        borderRadius: typeof value === 'object' ? 1 : 0,
                        border: typeof value === 'object' ? '1px solid #e0e0e0' : 'none',
                      }}
                    >
                      {formatComplexValue(value, key)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="subtitle2">Audit</Typography>
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des Logs
            </Typography>
          </Grid>
        </Grid>
      </MainCard>

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
                      Description
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '0.75rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}>
                      Action
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
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0', maxWidth: '200px' }}>
                        {!isEmptyValue(log.oldValues) ? (
                          <Button
                            variant="text"
                            color="primary"
                            onClick={(e) => handleOpenPopover(e, log.oldValues, 'Anciennes Valeurs Details')}
                            aria-label="Voir les détails des anciennes valeurs"
                          >
                            Voir les détails
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell sx={{ borderRight: '1px solid #e0e0e0', maxWidth: '200px' }}>
                        {!isEmptyValue(log.newValues) ? (
                          <Button
                            variant="text"
                            color="primary"
                            onClick={(e) => handleOpenPopover(e, log.newValues, 'Nouvelles Valeurs Details')}
                            aria-label="Voir les détails des nouvelles valeurs"
                          >
                            Voir les détails
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

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

      <Popover
        open={popover.open}
        anchorEl={null}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center'
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center'
        }}
        PaperProps={{
          sx: {
            width: '800px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            padding: 2,
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            overflow: 'auto'
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{popover.title}</Typography>
          <IconButton onClick={handleClosePopover} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DetailsTable data={popover.data} />
      </Popover>

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