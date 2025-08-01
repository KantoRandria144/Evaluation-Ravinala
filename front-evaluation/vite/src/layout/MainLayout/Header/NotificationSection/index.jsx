
// // src/components/NotificationSection.jsx
// import { useEffect, useRef, useState } from 'react';
// import { Link } from 'react-router-dom';
// import hubConnection from '../../../../../signalR'; // Importez votre connexion SignalR
// import axios from 'axios'; // Assurez-vous qu'Axios est importé
// import * as signalR from '@microsoft/signalr'; // Importez signalR

// // material-ui
// import { useTheme } from '@mui/material/styles';
// import Avatar from '@mui/material/Avatar';
// import { Box, Badge } from '@mui/material';
// import Button from '@mui/material/Button';
// import CardActions from '@mui/material/CardActions';
// import Chip from '@mui/material/Chip';
// import ClickAwayListener from '@mui/material/ClickAwayListener';
// import Divider from '@mui/material/Divider';
// import Grid from '@mui/material/Grid';
// import Paper from '@mui/material/Paper';
// import Popper from '@mui/material/Popper';
// import Stack from '@mui/material/Stack';
// import TextField from '@mui/material/TextField';
// import Typography from '@mui/material/Typography';
// import useMediaQuery from '@mui/material/useMediaQuery';
// import ButtonBase from '@mui/material/ButtonBase';

// // third-party
// import PerfectScrollbar from 'react-perfect-scrollbar';

// // project imports
// import MainCard from 'ui-component/cards/MainCard';
// import Transitions from 'ui-component/extended/Transitions';
// import NotificationList from './NotificationList';
// import { formulaireInstance } from '../../../../axiosConfig'; // Importez votre instance Axios

// // assets
// import { IconBell } from '@tabler/icons-react';

// // notification status options
// const statusOptions = [
//   {
//     value: 'all',
//     label: 'Toutes les Notifications'
//   },
//   {
//     value: 'new',
//     label: 'Nouvelles'
//   },
//   {
//     value: 'unread',
//     label: 'Non Lu'
//   }
// ];

// // ==============================|| NOTIFICATION ||============================== //

// const NotificationSection = () => {
//   const theme = useTheme();
//   const matchesXs = useMediaQuery(theme.breakpoints.down('md'));

//   const [open, setOpen] = useState(false);
//   const [filter, setFilter] = useState('all');
//   const [notifications, setNotifications] = useState([]);
//   const [unreadCount, setUnreadCount] = useState(0);

//   const anchorRef = useRef(null);

//   // Obtenez l'ID de l'utilisateur actuel
//   const user = JSON.parse(localStorage.getItem('user'));
//   const userId = user.id;

//   const handleToggle = () => {
//     setOpen((prevOpen) => !prevOpen);
//   };

//   const handleClose = (event) => {
//     if (anchorRef.current && anchorRef.current.contains(event.target)) {
//       return;
//     }
//     setOpen(false);
//   };

//   const prevOpen = useRef(open);

//   useEffect(() => {
//     if (prevOpen.current === true && open === false) {
//       anchorRef.current.focus();
//     }
//     prevOpen.current = open;
//   }, [open]);

//   const handleFilterChange = (event) => {
//     setFilter(event.target.value);
//   };

//   useEffect(() => {
//     // Fonction pour récupérer les notifications existantes
//     const fetchNotifications = async () => {
//       try {
//         const [notificationsResponse, unreadCountResponse] = await Promise.all([
//           formulaireInstance.get(`/notification/notifications/${userId}`),
//           formulaireInstance.get(`/notification/notifications/unread-count/${userId}`)
//         ]);

//         setNotifications(notificationsResponse.data);
//         setUnreadCount(unreadCountResponse.data.unreadCount); // Mettre à jour le nombre de non-lus
//       } catch (error) {
//         console.error('Erreur lors de la récupération des notifications', error);
//       }
//     };

//     fetchNotifications();

//     // Vérifiez si la connexion est déjà établie avant d'ajouter l'écouteur
//     if (
//       hubConnection.state === signalR.HubConnectionState.Disconnected ||
//       hubConnection.state === signalR.HubConnectionState.Reconnecting
//     ) {
//       console.log('Connexion SignalR non établie, tentative de connexion...');
//       hubConnection.start().catch(err => console.error('Erreur de connexion au hub SignalR', err));
//     } else {
//       console.log('Déjà connecté au hub SignalR');
//     }
    

//     // S'abonner aux notifications
//     const receiveNotificationHandler = (notification) => {
//       setNotifications((prev) => [notification, ...prev]);
//       setUnreadCount((prevCount) => prevCount + 1); // Incrémentez les non-lus
//     };

//     hubConnection.on('ReceiveNotification', receiveNotificationHandler);

//     // Nettoyage lors du démontage du composant
//     return () => {
//       hubConnection.off('ReceiveNotification', receiveNotificationHandler);
//       // Ne pas arrêter la connexion globale ici si elle est utilisée ailleurs
//     };
//   }, [userId]);

//   // Fonction pour marquer toutes les notifications comme lues
//   const handleMarkAllAsRead = async () => {
//     const unreadNotifications = notifications.filter((n) => !n.isRead).map((n) => n.id);
//     console.log('Payload being sent:', unreadNotifications);


//     if (unreadNotifications.length > 0) {
//       try {
//         await formulaireInstance.post('/notification/notifications/mark-as-read', unreadNotifications, {
//         });
//         setNotifications((prev) =>
//           prev.map((n) => ({ ...n, isRead: true }))
//         );
//       } catch (error) {
//         console.error('Erreur lors du marquage comme lu', error);
//       }
//     }
//   };

//   // Filtrer les notifications en fonction du filtre sélectionné
//   const filteredNotifications = notifications.filter((notification) => {
//     if (filter === 'all') return true;
//     if (filter === 'new') return !notification.isRead;
//     if (filter === 'unread') return !notification.isRead;
   
//     return true;
//   });

//   return (
//     <>
//       <Box
//         sx={{
//           ml: 2,
//           mr: 3,
//           [theme.breakpoints.down('md')]: {
//             mr: 2
//           }
//         }}
//       >
//         <ButtonBase sx={{ borderRadius: '12px' }}>
//         <Badge badgeContent={unreadCount} color="error">
//           <Avatar
//             variant="rounded"
//             sx={{
//               ...theme.typography.commonAvatar,
//               ...theme.typography.mediumAvatar,
//               transition: 'all .2s ease-in-out',
//               background: theme.palette.secondary.light,
//               color: theme.palette.secondary.dark,
//               '&[aria-controls="menu-list-grow"],&:hover': {
//                 background: theme.palette.secondary.dark,
//                 color: theme.palette.secondary.light
//               }
//             }}
//             ref={anchorRef}
//             aria-controls={open ? 'menu-list-grow' : undefined}
//             aria-haspopup="true"
//             onClick={handleToggle}
//             color="inherit"
//           >
//             <IconBell stroke={1.5} size="1.3rem" />
//           </Avatar>
//           </Badge>
//         </ButtonBase>
//       </Box>
//       <Popper
//         placement={matchesXs ? 'bottom' : 'bottom-end'}
//         open={open}
//         anchorEl={anchorRef.current}
//         role={undefined}
//         transition
//         disablePortal
//         popperOptions={{
//           modifiers: [
//             {
//               name: 'offset',
//               options: {
//                 offset: [matchesXs ? 5 : 0, 20]
//               }
//             }
//           ]
//         }}
//       >
//         {({ TransitionProps }) => (
//           <Transitions position={matchesXs ? 'top' : 'top-right'} in={open} {...TransitionProps}>
//             <Paper>
//               <ClickAwayListener onClickAway={handleClose}>
//                 <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
//                   <Grid container direction="column" spacing={2}>
//                     <Grid item xs={12}>
//                       <Grid container alignItems="center" justifyContent="space-between" sx={{ pt: 2, px: 2 }}>
//                         <Grid item>
//                           <Stack direction="row" spacing={2}>
//                             <Typography variant="subtitle1">Toutes les Notifications</Typography>
                            
//                           </Stack>
//                         </Grid>
//                         <Grid item>
//                           <Typography
//                             component={Link}
//                             to="#"
//                             variant="subtitle2"
//                             color="primary"
//                             onClick={handleMarkAllAsRead}
//                             style={{ cursor: 'pointer' }}
//                           >
//                             Tous lu
//                           </Typography>
//                         </Grid>
//                       </Grid>
//                     </Grid>
//                     <Grid item xs={12}>
//                       <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 205px)', overflowX: 'hidden' }}>
//                         <Grid container direction="column" spacing={2}>
//                           <Grid item xs={12}>
//                             <Box sx={{ px: 2, pt: 0.25 }}>
//                               <TextField
//                                 id="outlined-select-currency-native"
//                                 select
//                                 fullWidth
//                                 value={filter}
//                                 onChange={handleFilterChange}
//                                 SelectProps={{
//                                   native: true
//                                 }}
//                               >
//                                 {statusOptions.map((option) => (
//                                   <option key={option.value} value={option.value}>
//                                     {option.label}
//                                   </option>
//                                 ))}
//                               </TextField>
//                             </Box>
//                           </Grid>
//                           <Grid item xs={12} p={0}>
//                             <Divider sx={{ my: 0 }} />
//                           </Grid>
//                         </Grid>
//                         <NotificationList notifications={filteredNotifications} setNotifications={setNotifications} />
//                       </PerfectScrollbar>
//                     </Grid>
//                   </Grid>
//                   <Divider />
//                   <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
//                     <Button size="small" disableElevation>
//                       Voir Tout
//                     </Button>
//                   </CardActions>
//                 </MainCard>
//               </ClickAwayListener>
//             </Paper>
//           </Transitions>
//         )}
//       </Popper>
//     </>
//   );
// };

// export default NotificationSection;


import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formulaireInstance } from '../../../../axiosConfig'; // Utilisez votre instance Axios

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import { Box, Badge } from '@mui/material';
import Button from '@mui/material/Button';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import ButtonBase from '@mui/material/ButtonBase';

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';
import NotificationList from './NotificationList';

// assets
import { IconBell } from '@tabler/icons-react';

// notification status options
const statusOptions = [
  {
    value: 'all',
    label: 'Toutes les Notifications',
  },
  {
    value: 'new',
    label: 'Nouvelles',
  },
  {
    value: 'unread',
    label: 'Non Lu',
  },
];

// ==============================|| NOTIFICATION ||============================== //

const NotificationSection = () => {
  const theme = useTheme();
  const matchesXs = useMediaQuery(theme.breakpoints.down('md'));

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const anchorRef = useRef(null);

  // Obtenez l'ID de l'utilisateur actuel
  const user = JSON.parse(localStorage.getItem('user'));
  const userId = user.id;

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
  };

  const prevOpen = useRef(open);

  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current.focus();
    }
    prevOpen.current = open;
  }, [open]);

  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  const normalizeNotification = (notification) => ({
    id: notification.Id || notification.id || 'ID manquant',
    senderMatricule: notification.SenderMatricule || notification.senderMatricule || 'Utilisateur inconnu',
    message: notification.Message || notification.message || 'Aucun message',
    createdAt: notification.CreatedAt || notification.createdAt || new Date().toISOString(),
    isRead: notification.IsRead !== undefined ? notification.IsRead : notification.isRead || false,
  });  

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [notificationsResponse, unreadCountResponse] = await Promise.all([
          formulaireInstance.get(`/notification/notifications/${userId}`),
          formulaireInstance.get(`/notification/notifications/unread-count/${userId}`),
        ]);

        setNotifications(notificationsResponse.data.map(normalizeNotification));
        setUnreadCount(unreadCountResponse.data.unreadCount);
      } catch (error) {
        console.error('Erreur lors de la récupération des notifications', error);
      }
    };

    fetchNotifications();

    // Configurer la connexion SSE
    const eventSource = new EventSource(`http://localhost:5231/api/notification/notifications/stream?userId=${userId}`);

    eventSource.onmessage = (event) => {
      const rawNotification = JSON.parse(event.data);
      console.log('Notification brute reçue via SSE:', rawNotification);
      const notification = normalizeNotification(rawNotification);
      console.log('Notification normalisée :', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prevCount) => prevCount + 1);
    };

    eventSource.onerror = (error) => {
      console.error('Erreur SSE :', error);
      eventSource.close();
    };

    // Nettoyage lors du démontage du composant
    return () => {
      eventSource.close();
    };
  }, [userId]);

  // Fonction pour marquer toutes les notifications comme lues
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead).map((n) => n.id);
    console.log('Payload being sent:', unreadNotifications);

    if (unreadNotifications.length > 0) {
      try {
        await formulaireInstance.post('/notification/notifications/mark-as-read', unreadNotifications);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      } catch (error) {
        console.error('Erreur lors du marquage comme lu', error);
      }
    }
  };

  // Filtrer les notifications en fonction du filtre sélectionné
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'new') return !notification.isRead;
    if (filter === 'unread') return !notification.isRead;

    return true;
  });

  return (
    <>
      <Box
        sx={{
          ml: 2,
          mr: 3,
          [theme.breakpoints.down('md')]: {
            mr: 2
          }
        }}
      >
        <ButtonBase sx={{ borderRadius: '12px' }}>
          <Badge badgeContent={unreadCount} color="error">
            <Avatar
              variant="rounded"
              sx={{
                ...theme.typography.commonAvatar,
                ...theme.typography.mediumAvatar,
                transition: 'all .2s ease-in-out',
                background: theme.palette.secondary.light,
                color: theme.palette.secondary.dark,
                '&[aria-controls="menu-list-grow"],&:hover': {
                  background: theme.palette.secondary.dark,
                  color: theme.palette.secondary.light
                }
              }}
              ref={anchorRef}
              aria-controls={open ? 'menu-list-grow' : undefined}
              aria-haspopup="true"
              onClick={handleToggle}
              color="inherit"
            >
              <IconBell stroke={1.5} size="1.3rem" />
            </Avatar>
          </Badge>
        </ButtonBase>
      </Box>
      <Popper
        placement={matchesXs ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        popperOptions={{
          modifiers: [
            {
              name: 'offset',
              options: {
                offset: [matchesXs ? 5 : 0, 20]
              }
            }
          ]
        }}
      >
        {({ TransitionProps }) => (
          <Transitions position={matchesXs ? 'top' : 'top-right'} in={open} {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                  <Grid container direction="column" spacing={2}>
                    <Grid item xs={12}>
                      <Grid container alignItems="center" justifyContent="space-between" sx={{ pt: 2, px: 2 }}>
                        <Grid item>
                          <Stack direction="row" spacing={2}>
                            <Typography variant="subtitle1">Notifications</Typography>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid item xs={12}>
                      <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 205px)', overflowX: 'hidden' }}>
                        <Grid container direction="column" spacing={2}>
                          <Grid item xs={12}>
                            <Box sx={{ px: 2, pt: 0.25 }}>
                              <TextField
                                id="outlined-select-currency-native"
                                select
                                fullWidth
                                value={filter}
                                onChange={handleFilterChange}
                                SelectProps={{
                                  native: true
                                }}
                              >
                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </TextField>
                            </Box>
                          </Grid>
                          <Grid item xs={12} p={0}>
                            <Divider sx={{ my: 0 }} />
                          </Grid>
                        </Grid>
                        <NotificationList notifications={filteredNotifications} setNotifications={setNotifications} />
                      </PerfectScrollbar>
                    </Grid>
                  </Grid>
                  <Divider />
                  <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
                    <Grid item>
                      <Typography
                        component={Link}
                        to="#"
                        variant="subtitle2"
                        color="primary"
                        onClick={handleMarkAllAsRead}
                        style={{ cursor: 'pointer' }}
                      >
                        Marquer tout comme lu
                      </Typography>
                    </Grid>
                  </CardActions>
                </MainCard>
              </ClickAwayListener>
            </Paper>
          </Transitions>
        )}
      </Popper>
    </>
  );
};

export default NotificationSection;
