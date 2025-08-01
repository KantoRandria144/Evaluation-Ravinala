// assets
import { IconUsers } from '@tabler/icons-react';


// constant 
const icons = { IconUsers };

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const manager = {
  
  id: 'manager',
  title: 'Manager',
  type: 'group',
  children: [
    {
      id: 'CollabDirect',
      title: 'Collaborateur',
      type: 'item',
      url: '/manager/subordonne',
      requiredHabilitation: 14,
      icon: icons.IconUsers,
      breadcrumbs: false
    }
  ]
};

export default manager;