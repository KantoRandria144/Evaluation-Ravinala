import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Typography,
  TextField,
  Box,
  Button,
  Pagination
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import CheckIcon from '@mui/icons-material/Check';
import MainCard from 'ui-component/cards/MainCard';
import { authInstance, formulaireInstance } from '../../../../axiosConfig';
import AuditService from '../../../../services/AuditService';

const NOnAutoriser = () => {
  const [openRow, setOpenRow] = useState(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [employees, setEmployees] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const navigate = useNavigate();

  // Droits (pour afficher le bouton "Autoriser")
  const CLASSIFIER = 8;
  const [canClassify, setCanClassify] = useState(false);

  // Vérifier habilitations
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user.id;
  const checkPermissions = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user.id;

      // Vérifier l'habilitation pour classifier (8)
      const classifyResponse = await formulaireInstance.get(
        `/Periode/test-authorization?userId=${userId}&requiredHabilitationAdminId=${CLASSIFIER}`
      );
      setCanClassify(classifyResponse.data.hasAccess);
      
    } catch (error) {
      console.error('Erreur lors de la vérification des autorisations :', error);
    }
  };

  useEffect(() => {
    checkPermissions();
    fetchInitialUsers();
  }, []);

  // Consultation initiale des utilisateurs (TypeUser = null)
  const fetchInitialUsers = async () => {
    try {
      const response = await authInstance.get('/User/users-with-null-type');
      setEmployees(response.data);

    } catch (error) {
      console.error('Error fetching users with null type:', error);
    }
  };

  // Consultation filtrée des utilisateurs (TypeUser = null)
  // On met "undefined" si un champ est vide
  const fetchFilteredUsers = async (nameOrMail, department) => {
    try {
      const response = await authInstance.get('/User/all-null-type', {
        params: {
          NameOrMail: nameOrMail || undefined,
          Department: department || undefined
        }
      });
      setEmployees(response.data);
      setCurrentPage(1); // Revenir à la page 1 après filtrage
      await AuditService.logAction(
        userId,
        'Consultation des utilisateurs non classifiés avec filtres',
        'Fetch',
        null
      );
    } catch (error) {
      console.error('Error fetching filtered users with null type:', error);
    }
  };

  // Ouverture/fermeture du détail (s’il y en avait besoin)
  const toggleRow = (id) => {
    setOpenRow(openRow === id ? null : id);
  };

  // Handlers pour la mise à jour dynamique des champs de filtre
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployeesData = employees.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            {/* <Typography variant="subtitle2">Utilisateur</Typography> */}
            <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
              Liste des collaborateurs non classifiés
            </Typography>
          </Grid>

          <Grid item>
            {canClassify && (
              <Button
                variant="contained"
                startIcon={<CheckIcon />}
                sx={{ marginLeft: 2 }}
                onClick={() => navigate('/utilisateur/autorisation')}
              >
                Classifier
              </Button>
            )}
          </Grid>
        </Grid>
      </MainCard>

      {/* Filtres affichés en permanence */}
      <Box sx={{ padding: 2 }}>
        <Grid container spacing={2}>
          {/* Nom ou Email */}
          <Grid item xs={12} md={2}>
            <TextField
              label="Nom ou Email"
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
              fullWidth
            />
          </Grid>

          {/* Département */}
          <Grid item xs={12} md={2}>
            <TextField
              label="Département"
              value={departmentFilter}
              onChange={handleDepartmentChange}
              variant="outlined"
              fullWidth
            />
          </Grid>
        </Grid>
      </Box>

      <TableContainer component="div" sx={{ padding: 2 }}>
        <Table aria-label="collapsible table" sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell
                sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}
              >
                Matricule
              </TableCell>
              <TableCell
                sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}
              >
                Nom et prénom
              </TableCell>
              <TableCell
                sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}
              >
                Email
              </TableCell>
              <TableCell
                sx={{ fontWeight: 'bold', fontSize: '1rem', padding: '12px', borderRight: '1px solid #e0e0e0' }}
              >
                Département
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {currentEmployeesData.map((employee) => (
              <React.Fragment key={employee.id}>
                <TableRow hover>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                    <Link to={`/employee/${employee.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {employee.matricule}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                    {employee.name}
                  </TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                    {employee.email}
                  </TableCell>
                  <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
                    {employee.department}
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
              // borderRadius: '16px',
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

export default NOnAutoriser;

// import React, { useState } from 'react';
// import {
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Grid,
//   Typography,
//   TextField,
//   Box,
//   Button,
//   Pagination
// } from '@mui/material';
// import { useNavigate, Link } from 'react-router-dom';
// import CheckIcon from '@mui/icons-material/Check';
// import MainCard from 'ui-component/cards/MainCard';

// const NOnAutoriser = () => {
//   // Données fictives (10 utilisateurs)
//   const [employees, setEmployees] = useState([
//     {
//       id: 1,
//       matricule: 'st122',
//       name: 'Rasoa Ralambo',
//       email: 'rasoa.ralambo@gmail.com',
//       department: 'DSI'
//     },
//     {
//       id: 2,
//       matricule: 'st125',
//       name: 'Rakoto Rabenoro',
//       email: 'rakoto.rabenoro@gmail.com',
//       department: 'DRH'
//     },
//     {
//       id: 3,
//       matricule: 'st126',
//       name: 'Rajo Andrianarisoa',
//       email: 'rajo.andrianarisoa@gmail.com',
//       department: 'DCM'
//     },
//     {
//       id: 4,
//       matricule: 'st127',
//       name: 'Fara Randrianina',
//       email: 'fara.randrianina@gmail.com',
//       department: 'DQRSE'
//     },
//     {
//       id: 5,
//       matricule: 'st128',
//       name: 'Mamy Razafindrakoto',
//       email: 'mamy.razafindrakoto@gmail.com',
//       department: 'DSI'
//     },
//     {
//       id: 6,
//       matricule: 'st129',
//       name: 'Hanta Andriamihaja',
//       email: 'hanta.andriamihaja@gmail.com',
//       department: 'DRH'
//     },
//     {
//       id: 7,
//       matricule: 'st130',
//       name: 'Tovo Randrianasolo',
//       email: 'tovo.randrianasolo@gmail.com',
//       department: 'DQRSE'
//     },
//     {
//       id: 8,
//       matricule: 'st131',
//       name: 'Zo Rakotoniaina',
//       email: 'zo.rakotoniaina@gmail.com',
//       department: 'DCM'
//     },
//     {
//       id: 9,
//       matricule: 'st132',
//       name: 'Lala Andriantsara',
//       email: 'lala.andriantsara@gmail.com',
//       department: 'DSI'
//     },
//     {
//       id: 10,
//       matricule: 'st133',
//       name: 'Sariaka Rakotondrasoa',
//       email: 'sariaka.rakotondrasoa@gmail.com',
//       department: 'DRH'
//     }
//   ]);
  

//   // Filtres
//   const [searchTerm, setSearchTerm] = useState('');
//   const [departmentFilter, setDepartmentFilter] = useState('');

//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 3;

//   // Simule l’habilitation à classifier (vous pouvez changer cette valeur)
//   const [canClassify] = useState(true);

//   const navigate = useNavigate();

//   // Gestion de la recherche : on filtre directement sur le tableau local
//   // On peut faire la filtration "à la volée"
//   const filteredEmployees = employees.filter((emp) => {
//     const matchNameOrEmail =
//       emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       emp.email.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchDepartment = departmentFilter
//       ? emp.department.toLowerCase().includes(departmentFilter.toLowerCase())
//       : true;

//     return matchNameOrEmail && matchDepartment;
//   });

//   // Logique de pagination
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentEmployeesData = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);

//   const handlePageChange = (event, newPage) => {
//     setCurrentPage(newPage);
//   };

//   const handleSearchChange = (event) => {
//     setSearchTerm(event.target.value);
//     setCurrentPage(1); // réinitialise la pagination
//   };

//   const handleDepartmentChange = (event) => {
//     setDepartmentFilter(event.target.value);
//     setCurrentPage(1); // réinitialise la pagination
//   };

//   return (
//     <Paper>
//       <MainCard>
//         <Grid container alignItems="center" justifyContent="space-between">
//           <Grid item>
//             <Typography variant="h3" gutterBottom sx={{ marginTop: '0.5rem' }}>
//               Liste des collaborateurs non classifiés
//             </Typography>
//           </Grid>

//           <Grid item>
//             {canClassify && (
//               <Button
//                 variant="contained"
//                 startIcon={<CheckIcon />}
//                 sx={{ marginLeft: 2 }}
//                 onClick={() => navigate('/utilisateur/autorisation')}
//               >
//                 Classifier
//               </Button>
//             )}
//           </Grid>
//         </Grid>
//       </MainCard>

//       {/* Filtres affichés en permanence */}
//       <Box sx={{ padding: 2 }}>
//         <Grid container spacing={2}>
//           <Grid item xs={12} md={2}>
//             <TextField
//               label="Nom ou Email"
//               value={searchTerm}
//               onChange={handleSearchChange}
//               variant="outlined"
//               fullWidth
//             />
//           </Grid>
//           <Grid item xs={12} md={2}>
//             <TextField
//               label="Département"
//               value={departmentFilter}
//               onChange={handleDepartmentChange}
//               variant="outlined"
//               fullWidth
//             />
//           </Grid>
//         </Grid>
//       </Box>

//       <TableContainer component="div" sx={{ padding: 2 }}>
//         <Table
//           aria-label="collapsible table"
//           sx={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}
//         >
//           <TableHead>
//             <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
//               <TableCell
//                 sx={{
//                   fontWeight: 'bold',
//                   fontSize: '1rem',
//                   padding: '12px',
//                   borderRight: '1px solid #e0e0e0'
//                 }}
//               >
//                 Matricule
//               </TableCell>
//               <TableCell
//                 sx={{
//                   fontWeight: 'bold',
//                   fontSize: '1rem',
//                   padding: '12px',
//                   borderRight: '1px solid #e0e0e0'
//                 }}
//               >
//                 Nom et prénom
//               </TableCell>
//               <TableCell
//                 sx={{
//                   fontWeight: 'bold',
//                   fontSize: '1rem',
//                   padding: '12px',
//                   borderRight: '1px solid #e0e0e0'
//                 }}
//               >
//                 Email
//               </TableCell>
//               <TableCell
//                 sx={{
//                   fontWeight: 'bold',
//                   fontSize: '1rem',
//                   padding: '12px',
//                   borderRight: '1px solid #e0e0e0'
//                 }}
//               >
//                 Département
//               </TableCell>
//             </TableRow>
//           </TableHead>

//           <TableBody>
//             {currentEmployeesData.map((employee) => (
//               <React.Fragment key={employee.id}>
//                 <TableRow hover>
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
//                     <Link
//                       to={`/employee/${employee.id}`}
//                       style={{ textDecoration: 'none', color: 'inherit' }}
//                     >
//                       {employee.matricule}
//                     </Link>
//                   </TableCell>
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
//                     {employee.name}
//                   </TableCell>
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
//                     {employee.email}
//                   </TableCell>
//                   <TableCell sx={{ borderRight: '1px solid #e0e0e0' }}>
//                     {employee.department}
//                   </TableCell>
//                 </TableRow>
//               </React.Fragment>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>

//       <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
//         <Pagination
//           count={Math.ceil(filteredEmployees.length / itemsPerPage)}
//           page={currentPage}
//           onChange={handlePageChange}
//           variant="outlined"
//           shape="rounded"
//           color="primary"
//           sx={{
//             '& .MuiPaginationItem-root': {
//               padding: '6px 12px',
//               fontSize: '1rem',
//               margin: '0 4px',
//               color: '#4a4a4a',
//               backgroundColor: '#f7f9fc',
//               border: '1px solid #ddd',
//               transition: 'all 0.3s ease',
//               '&:hover': {
//                 backgroundColor: '#e0e7ff',
//                 color: '#3f51b5'
//               },
//               marginBottom: 2,
//               marginTop: 2
//             },
//             '& .MuiPaginationItem-root.Mui-selected': {
//               backgroundColor: '#3f51b5',
//               color: '#ffffff',
//               fontWeight: 'bold',
//               borderColor: '#3f51b5',
//               transform: 'scale(1.05)',
//               boxShadow: '0 4px 10px rgba(63, 81, 181, 0.2)'
//             }
//           }}
//         />
//       </Grid>
//     </Paper>
//   );
// };

// export default NOnAutoriser;
