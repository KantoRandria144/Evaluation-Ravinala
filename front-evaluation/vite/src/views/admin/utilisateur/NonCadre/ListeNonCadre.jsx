import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  Grid,
  Typography,
  TextField,
  Box,
  Button,
  Pagination,
  Menu
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { KeyboardArrowDown, KeyboardArrowUp, FilterList as FilterListIcon } from '@mui/icons-material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ClearIcon from '@mui/icons-material/Clear';
import MainCard from 'ui-component/cards/MainCard';
import { Link } from 'react-router-dom';
import { authInstance } from '../../../../axiosConfig';

const ListeNonCadre = () => {
  const [openRow, setOpenRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialUsers(); // Load initial unfiltered cadre users on component mount
  }, []);

  // Fetch initial data for Cadre users only
  const fetchInitialUsers = async () => {
    try {
      const response = await authInstance.get('/User/users-non-cadre');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching initial cadre users:', error);
    }
  };

  // Fetch filtered data for Cadre users only
  const fetchFilteredUsers = async (nameOrMail, department) => {
    try {
      const response = await authInstance.get('/User/all-non-cadre', {
        params: {
          NameOrMail: nameOrMail || undefined,
          Department: department || undefined
        }
      });
      setEmployees(response.data);
      setCurrentPage(1); // Reset to first page after filtering
    } catch (error) {
      console.error('Error fetching filtered cadre users:', error);
    }
  };

  const toggleRow = (id) => {
    setOpenRow(openRow === id ? null : id);
  };

  // Open and close the filter menu
  const handleFilterIconClick = (event) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };

  // Dynamic filtering as user types
  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    fetchFilteredUsers(value, departmentFilter);
  };

  const handleDepartmentChange = (event) => {
    const value = event.target.value;
    setDepartmentFilter(value);
    fetchFilteredUsers(searchTerm, value);
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = employees.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleAddClick = (userId) => {
    navigate(`/utilisateur/assignation/${userId}`); // Navigate with userId in the URL
  };

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="subtitle2">Utilisateur</Typography>
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des utilisateurs Non Cadres
            </Typography>
          </Grid>

          <Grid item>
            <IconButton
              onClick={handleFilterIconClick}
              sx={{
                borderRadius: '8px',
                border: '1px solid #ddd',
                padding: '8px',
                color: 'primary.main',
                '&:hover': {
                  backgroundColor: '#f0f0f0'
                }
              }}
            >
              <FilterListIcon stroke={1.5} size="24px" />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<AddCircleIcon />}
              sx={{ marginLeft: 2 }}
              onClick={() => navigate('/utilisateur/assignAllNonCadre')}
            >
              Assigner
            </Button>
          </Grid>
        </Grid>
      </MainCard>

      {/* Filter Menu Panel */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        sx={{
          '& .MuiPaper-root': {
            padding: 2,
            width: 400, // Width for side-by-side fields
            borderRadius: 2,
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
            marginLeft: '-250px',
            marginTop: '-20px'
          }
        }}
      >
        <Typography variant="h6" gutterBottom>
          Filtres
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField label="Nom ou Email" value={searchTerm} onChange={handleSearchChange} variant="outlined" fullWidth />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Département" value={departmentFilter} onChange={handleDepartmentChange} variant="outlined" fullWidth />
          </Grid>
        </Grid>
      </Menu>

      <TableContainer>
        <Table aria-label="employee table">
          <TableHead>
            <TableRow>
              <TableCell>Nom et prénom</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Département</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentEmployees &&
              currentEmployees.map((employee) => (
                <React.Fragment key={employee.id}>
                  <TableRow hover>
                    <TableCell>
                      <Link to={`/employee/${employee.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {employee.name}
                      </Link>
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell padding="checkbox">
                      <IconButton size="small" color="success" onClick={() => toggleRow(employee.id)}>
                        {openRow === employee.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                      <Collapse in={openRow === employee.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 3, border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', backgroundColor: '#f9f9f9' }}>
                          <Grid container alignItems="center" justifyContent="space-between" sx={{ marginBottom: 2 }}>
                            <Typography variant="h6" component="div" color="textSecondary">
                              Habilitations
                            </Typography>
                            <Button
                              variant="outlined"
                              startIcon={<AddCircleIcon />}
                              onClick={() => handleAddClick(employee.id)}
                              sx={{ marginLeft: 2 }}
                            >
                              Ajouter
                            </Button>
                          </Grid>
                          <Table size="small" aria-label="habilitation details" sx={{ mt: 1 }}>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                                <TableCell>
                                  <strong>Label</strong>
                                </TableCell>
                                <TableCell align="right">
                                  <strong>Action</strong>
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(employee.habilitations || []).map((habilitation) => (
                                <TableRow key={habilitation.id} hover sx={{ '&:hover': { backgroundColor: '#eaf1fc' } }}>
                                  <TableCell>{habilitation.label}</TableCell>
                                  <TableCell align="right">
                                    <IconButton size="small">
                                      <ClearIcon color="error" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
        <Pagination
          count={Math.ceil(employees.length / itemsPerPage)}
          page={currentPage}
          onChange={handlePageChange}
          variant="outlined"
          shape="rounded"
          color="primary"
          sx={{
            '& .MuiPaginationItem-root': {
              borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '1rem',
              margin: '0 4px',
              color: '#4a4a4a',
              backgroundColor: '#f7f9fc',
              border: '1px solid #ddd',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#e0e7ff',
                color: '#3f51b5'
              },
              marginBottom: 2,
              marginTop: 2
            },
            '& .MuiPaginationItem-root.Mui-selected': {
              backgroundColor: '#3f51b5',
              color: '#ffffff',
              fontWeight: 'bold',
              borderColor: '#3f51b5',
              transform: 'scale(1.05)',
              boxShadow: '0 4px 10px rgba(63, 81, 181, 0.2)'
            }
          }}
        />
      </Grid>
    </Paper>
  );
};

export default ListeNonCadre;
