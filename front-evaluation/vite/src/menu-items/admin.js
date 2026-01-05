import { IconKey, IconUsers, IconFileImport, IconDashboard, IconRotateClockwise, IconFileText } from '@tabler/icons-react';
// constant
const icons = {
  IconKey, IconUsers, IconFileImport, IconDashboard,IconRotateClockwise,IconFileText
};

// ==============================|| EXTRA PAGES MENU ITEMS ||============================== //

const admin = {
  id: 'admin',
  title: 'Admin',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      type: 'item',
      url: '/dashboardAdmin/dashboard',
      requiredHabilitation: 31,
      icon: icons.IconDashboard,
      breadcrumbs: false
    },
    {
      id: 'admin-droits-acces',  // ✅ Changé
      title: 'Droits et accès',
      type: 'collapse',
      icon: icons.IconKey,
      children: [
        {
          id: 'listeHabilitation',
          title: 'Habilitation',
          type: 'item',
          url: '/habilitation/listeHabilitation',
          requiredHabilitation: 1,
          target: false,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'admin-utilisateur',  // ✅ Changé
      title: 'Utilisateur',
      type: 'collapse',
      icon: icons.IconUsers,
      children: [
        {
          id: 'listeUtilisateur',
          title: 'Utilisateur',
          type: 'item',
          url: '/utilisateur/listeUtilisateur',
          requiredHabilitation: 6,
          target: false,
          breadcrumbs: false
        },
        {
          id: 'nullType',
          title: 'Non classifié',
          type: 'item',
          url: '/utilisateur/listeNonAutoriser',
          requiredHabilitation: 6,
          target: false,
          breadcrumbs: false
        }
      ]
    },
    {
      id: 'importCSV',
      title: 'Import',
      type: 'item',
      url: '/import/importCSV',
      requiredHabilitation: 27,
      icon: icons.IconFileImport,
      breadcrumbs: false
    },
    {
      id: 'Logs',
      title: 'Logs',
      type: 'item',
      url: '/logs/liste-logs',
      requiredHabilitation: 33,
      icon: icons.IconFileText,
      breadcrumbs: false
    }
  ]
};

export default admin;
