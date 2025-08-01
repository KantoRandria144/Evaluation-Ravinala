// import React, { useState, useEffect } from 'react';
// import { authInstance } from '../../../../../axiosConfig';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   Typography,
//   Box,
//   Grid,
//   Card,
//   CardContent,
//   IconButton
// } from '@mui/material';
// import MoreVertIcon from '@mui/icons-material/MoreVert';
// import MainCard from 'ui-component/cards/MainCard';
// import FolderIcon from '@mui/icons-material/Folder';
// import { useNavigate } from 'react-router-dom';

// function AllCadre() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const navigate = useNavigate();

//   const fetchUsersCadre = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const response = await authInstance.get('/User/users-cadre'); // Appel API
//       setUsers(response.data); // Stockez les utilisateurs dans l'état
//     } catch (err) {
//       console.error('Erreur lors de la récupération des utilisateurs Cadre :', err);
//       setError(err.response?.data?.message || 'Erreur inconnue');
//     } finally {
//       setLoading(false);  
//     }
//   };

//   const handleUserClick = (userId, typeUser) => {
//     navigate(`/allEvaluation/cadreYear/${userId}/${typeUser}`);
//   };

//   useEffect(() => {
//     fetchUsersCadre();
//   }, []);

//   if (loading) {
//     return <Typography>Chargement...</Typography>;
//   }

//   if (error) {
//     return <Typography color="error">Erreur : {error}</Typography>;
//   }

//   return (
//     <Paper>
//       <MainCard>
//         <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
//           <Grid item>
//             <Typography variant="subtitle2">Archive</Typography>
//             <Typography variant="h3" sx={{ marginTop: '0.5rem' }}>
//               Archive Evaluation Collaborateur Cadre
//             </Typography>
//           </Grid>
//         </Grid>

//         <Grid container spacing={3}>
//           {users.map((user) => (
//             <Grid item xs={12} sm={6} md={4} key={user.id}>
//               <Card
//                 sx={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   padding: '10px 20px',
//                   backgroundColor: '#E8EAF6',
//                   '&:hover': {
//                     backgroundColor: '#e3eaf5'
//                   }
//                 }}
//                 onClick={() => handleUserClick(user.id, user.typeUser)}
//               >
//                 <FolderIcon sx={{ fontSize: 24, color: 'rgb(57, 73, 171)', marginRight: '16px' }} />
//                 <CardContent sx={{ flexGrow: 1, padding: 0 }}>
//                   <Typography variant="body1" sx={{ color: '#1a202c' }}>
//                     {user.name}
//                   </Typography>
//                 </CardContent>
//                 <IconButton>
//                   <MoreVertIcon sx={{ fontSize: 20, color: '#757575' }} />
//                 </IconButton>
//               </Card>
//             </Grid>
//           ))}
//         </Grid>
//       </MainCard>
//     </Paper>
//   );
// }

// export default AllCadre;

// import React, { useState, useEffect } from 'react';
// import { authInstance } from '../../../../../axiosConfig';
// import {
//   Typography,
//   Box,
//   Grid,
//   Card,
//   CardContent,
//   IconButton,
//   Button,
//   Paper
// } from '@mui/material';
// import MoreVertIcon from '@mui/icons-material/MoreVert';
// import MainCard from 'ui-component/cards/MainCard';
// import FolderIcon from '@mui/icons-material/Folder';
// import { useNavigate } from 'react-router-dom';

// function AllCadre() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const [visibleUsers, setVisibleUsers] = useState(16); // Nombre initial d'utilisateurs affichés
//   const usersPerPage = 16; // Nombre d'utilisateurs à ajouter à chaque clic

//   const navigate = useNavigate();

//   const fetchUsersCadre = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const response = await authInstance.get('/User/users-cadre'); // Appel API
//       setUsers(response.data); // Stockez les utilisateurs dans l'état
//     } catch (err) {
//       console.error('Erreur lors de la récupération des utilisateurs Cadre :', err);
//       setError(err.response?.data?.message || 'Erreur inconnue');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleUserClick = (userId, typeUser) => {
//     navigate(`/allEvaluation/cadreYear/${userId}/${typeUser}`);
//   };

//   const handleLoadMore = () => {
//     setVisibleUsers((prevVisibleUsers) => prevVisibleUsers + usersPerPage);
//   };

//   useEffect(() => {
//     fetchUsersCadre();
//   }, []);

//   if (loading) {
//     return <Typography>Chargement...</Typography>;
//   }

//   if (error) {
//     return <Typography color="error">Erreur : {error}</Typography>;
//   }

//   return (
//     <Paper>
//       <MainCard>
//         <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
//           <Grid item>
//             <Typography variant="subtitle2">Archive</Typography>
//             <Typography variant="h3" sx={{ marginTop: '0.5rem' }}>
//               Archive Evaluation Collaborateur Cadre
//             </Typography>
//           </Grid>
//         </Grid>

//         <Grid container spacing={3}>
//           {users.slice(0, visibleUsers).map((user) => (
//             <Grid item xs={12} sm={6} md={3} key={user.id}>
//               <Card
//                 sx={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   padding: '10px 20px',
//                   backgroundColor: '#E8EAF6',
//                   '&:hover': {
//                     backgroundColor: '#e3eaf5'
//                   }
//                 }}
//                 onClick={() => handleUserClick(user.id, user.typeUser)}
//               >
//                 <FolderIcon sx={{ fontSize: 24, color: 'rgb(57, 73, 171)', marginRight: '16px' }} />
//                 <CardContent sx={{ flexGrow: 1, padding: 0 }}>
//                   <Typography variant="body1" sx={{ color: '#1a202c' }}>
//                     {user.matricule}
//                   </Typography>
//                 </CardContent>
//                 <IconButton>
//                   {/* <MoreVertIcon sx={{ fontSize: 20, color: '#757575' }} /> */}
//                 </IconButton>
//               </Card>
//             </Grid>
//           ))}
//         </Grid>

//         {visibleUsers < users.length && (
//           <Box sx={{ textAlign: 'left', mt: 3 }}>
//             <Button  onClick={handleLoadMore}>
//               Voir plus
//             </Button>
//           </Box>
//         )}
//       </MainCard>
//     </Paper>
//   );
// }

// export default AllCadre;


import React, { useState, useEffect } from 'react';
import { authInstance } from '../../../../../axiosConfig';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Paper,
  TextField
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MainCard from 'ui-component/cards/MainCard';
import FolderIcon from '@mui/icons-material/Folder';
import { useNavigate } from 'react-router-dom';

function AllCadre() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [visibleUsers, setVisibleUsers] = useState(12);
  const usersPerPage = 12;

  // Champs de recherche
  const [searchMatricule, setSearchMatricule] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchDept, setSearchDept] = useState('');

  const navigate = useNavigate();

  const fetchUsersCadre = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authInstance.get('/User/users-cadre'); // Appel API
      setUsers(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des utilisateurs Cadre :', err);
      setError(err.response?.data?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersCadre();
  }, []);

  const handleUserClick = (userId, typeUser) => {
    navigate(`/allEvaluation/cadreYear/${userId}/${typeUser}`);
  };

  const handleLoadMore = () => {
    setVisibleUsers((prevVisibleUsers) => prevVisibleUsers + usersPerPage);
  };

  // -- Filtrage des utilisateurs (matricule, nom, departement)
  const filteredUsers = users.filter((user) => {
    // Sécuriser l'accès aux propriétés (coalescence : ?? '')
    const matricule = user.matricule ?? '';
    const name = user.name ?? '';
    const departement = user.department ?? '';

    return (
      matricule.toLowerCase().includes(searchMatricule.toLowerCase()) &&
      name.toLowerCase().includes(searchName.toLowerCase()) &&
      departement.toLowerCase().includes(searchDept.toLowerCase())
    );
  });

  if (loading) {
    return <Typography>Chargement...</Typography>;
  }

  if (error) {
    return <Typography color="error">Erreur : {error}</Typography>;
  }

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="subtitle2">Archive</Typography>
            <Typography variant="h3" sx={{ marginTop: '0.5rem' }}>
              Archive Evaluation Collaborateur Cadre
            </Typography>
          </Grid>
        </Grid>

        {/* Champs de recherche : Matricule, Nom, Département */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Rechercher par matricule"
            variant="outlined"
            size="small"
            value={searchMatricule}
            onChange={(e) => setSearchMatricule(e.target.value)}
          />
          <TextField
            label="Rechercher par nom"
            variant="outlined"
            size="small"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <TextField
            label="Rechercher par département"
            variant="outlined"
            size="small"
            value={searchDept}
            onChange={(e) => setSearchDept(e.target.value)}
          />
        </Box>

        {/* Liste filtrée des utilisateurs (on n’affiche que le matricule) */}
        <Grid container spacing={3}>
          {filteredUsers.slice(0, visibleUsers).map((user) => (
            <Grid item xs={12} sm={6} md={4} key={user.id}>
              <Card
                onClick={() => handleUserClick(user.id, user.typeUser)}
                sx={{
                  // la carte doit remplir tout le container (Grid)
                  width: '100%',
                  // on fixe ici une hauteur (par ex. 150 px) pour qu’elles soient toutes identiques
                  height: 90,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  p: 2,
                  backgroundColor: '#E8EAF6',
                  '&:hover': {
                    backgroundColor: '#e3eaf5',
                    cursor: 'pointer'
                  }
                }}
              >
                <FolderIcon sx={{ fontSize: 24, color: 'rgb(57, 73, 171)', mr: 2 }} />
                <CardContent sx={{ p: 0, flexGrow: 1 }}>
                  <Typography variant="body1" sx={{ color: '#1a202c' }}>
                    {user.name}
                  </Typography>
                </CardContent>
                <IconButton>
                  {/* <MoreVertIcon sx={{ fontSize: 20, color: '#757575' }} /> */}
                </IconButton>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Bouton "Voir plus" si la liste filtrée n’est pas entièrement visible */}
        {visibleUsers < filteredUsers.length && (
          <Box sx={{ textAlign: 'left', mt: 3 }}>
            <Button onClick={handleLoadMore}>Voir plus</Button>
          </Box>
        )}
      </MainCard>
    </Paper>
  );
}

export default AllCadre;

