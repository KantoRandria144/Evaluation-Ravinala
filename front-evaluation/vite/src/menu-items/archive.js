// assets
import { IconFileZip, IconArchive } from '@tabler/icons-react';


// constant 
const icons = { IconFileZip, IconArchive };

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const archive = {
  id: 'archive',
  title: 'Historique',
  type: 'group',
  children: [
    {
      id: 'archiveMyEvaluation',
      title: 'Mes évaluations',
      type: 'item',
      url: '/archive/myEvaluation',
      requiredHabilitation: 23,
      icon: icons.IconFileZip,
      breadcrumbs: false
    },
    {
      id: 'authentication',
      title: 'Historique',
      type: 'collapse',
      icon: icons.IconArchive,

      children: [
        {
          id: 'archiveCadre',
          title: 'Cadre',
          type: 'item',
          url: '/allEvaluation/cadre',
          requiredHabilitation: 24,
          target: false,
          breadcrumbs: false
        },
        {
          id: 'listeSpec',
          title: 'Non Cadre',
          type: 'item', 
          url: '/allEvaluation/nonCadre',
          requiredHabilitation: 24,
          target: false,
          breadcrumbs: false
        }
      ]
    }
  ]
};

export default archive;
