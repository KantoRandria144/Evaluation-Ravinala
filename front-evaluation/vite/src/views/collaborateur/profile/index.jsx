import React, { useState } from 'react';
import { Avatar, Box, Button, Grid, Typography, List, ListItem, ListItemIcon, ListItemText, Paper } from '@mui/material';
import { Person, Gesture } from '@mui/icons-material';
import MainCard from 'ui-component/cards/MainCard';
import Profile from './Profile';
import Signature from './Signature';

const AccountSettings = () => {
  const [selectedComponent, setSelectedComponent] = useState('profile');

  return (
    <Paper>
      <MainCard>
        <Grid container alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="subtitle2">Profil</Typography>
            <Typography variant="h3">Vos informations</Typography>
          </Grid>
        </Grid>
      </MainCard>

      <Grid
        container
        sx={{
          backgroundColor: 'white',
          borderTop: '1px solid #e0e0e0',
          borderBottom: '1px solid #e0e0e0',
          borderRadius: 1,
        }}
      >
        {/* Sidebar */}
        <Grid
          item
          xs={4}
          sx={{
            borderRight: '1px solid #e0e0e0',
            p: 2,
          }}
        >
          <List>
            <ListItem
              selected={selectedComponent === 'profile'}
              sx={{ color: selectedComponent === 'profile' ? '#1976d2' : 'inherit' }}
              onClick={() => setSelectedComponent('profile')}
            >
              <ListItemIcon>
                <Person color={selectedComponent === 'profile' ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText primary="Profil" secondary="Information" />
            </ListItem>
            <ListItem
                selected={selectedComponent === 'signature'}
                sx={{ color: selectedComponent === 'signature' ? '#1976d2' : 'inherit' }}
                onClick={() => setSelectedComponent('signature')}
                >
                <ListItemIcon>
                    <Gesture color={selectedComponent === 'signature' ? 'primary' : 'inherit' } />
                </ListItemIcon>
                <ListItemText primary="Signature" secondary="Téléverser votre signature" />
                </ListItem>
          </List>
        </Grid>
        
          {selectedComponent === 'profile' && <Profile />}
          {selectedComponent === 'signature' && <Signature />}
        
      </Grid>
    </Paper>
  );
};

export default AccountSettings;
