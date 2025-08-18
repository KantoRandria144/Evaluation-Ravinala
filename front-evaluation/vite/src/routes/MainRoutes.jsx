import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';
import PrivateRoute from '../views/pages/authentication3/PrivateRoute';

// dashboard routing
const DashboardDefault = Loadable(lazy(() => import('views/dashboard')));

// utilities routing
// const UtilsTypography = Loadable(lazy(() => import('views/utilities/Typography')));
// const UtilsColor = Loadable(lazy(() => import('views/utilities/Color')));
// const UtilsShadow = Loadable(lazy(() => import('views/utilities/Shadow')));

//admin
const ListeHabilitation = Loadable(lazy(() => import('views/admin/habilitation/ListeHabilitation')));
const AjoutHabilitation = Loadable(lazy(() => import('views/admin/habilitation/AjoutHabilitation')));
const ListeSpec = Loadable(lazy(() => import('views/admin/specification/ListeSpec')));
const AjoutSpec = Loadable(lazy(() => import('views/admin/specification/AjoutSpec')));
const ListeUtilisateur = Loadable(lazy(() => import('views/admin/utilisateur/ListeUtilisateur')));

const ListeCadre = Loadable(lazy(() => import('views/admin/utilisateur/cadre/ListeCadre')));
const AssignAllCadre = Loadable(lazy(() => import('views/admin/utilisateur/cadre/AssignAllCadre')));

const ListeNonCadre = Loadable(lazy(() => import('views/admin/utilisateur/NonCadre/ListeNonCadre')));
const AssignAllNonCadre = Loadable(lazy(() => import('views/admin/utilisateur/NonCadre/AssignAllNonCadre')));

const ListeNonAutoriser = Loadable(lazy(() => import('views/admin/utilisateur/TypeNull/NonAutoriser')));
const Autorisation = Loadable(lazy(() => import('views/admin/utilisateur/TypeNull/Autorisation')));

const Assignation = Loadable(lazy(() => import('views/admin/utilisateur/Assignation')));
const AssignationAll = Loadable(lazy(() => import('views/admin/utilisateur/AssignationAll')));

const ImportCSV = Loadable(lazy(() => import('views/admin/import/index')));


const DashboardAdmin = Loadable(lazy(() => import('views/admin/dashboard/index')));


// Rh
const ListeEval = Loadable(lazy(() => import('views/rh/evaluation/Liste')));
const AjoutEval = Loadable(lazy(() => import('views/rh/evaluation/Ajout')));
const FormulaireCadre = Loadable(lazy(() => import('views/rh/formulaire/cadre/Formulaire')));
const FormulaireNonCadre = Loadable(lazy(() => import('views/rh/formulaire/nonCadre/index')));

// collab

//profile
const Profile = Loadable(lazy(() => import('views/collaborateur/profile/index')));

//evaluation
const Remplissage = Loadable(lazy(() => import('views/collaborateur/evaluation/evalCadre/CollabFo')));
const RemplissageNonCadre = Loadable(lazy(() => import('views/collaborateur/evaluation/evalNonCadre/CollabNFo')));
//archive
const AllEvaluationCadre = Loadable(lazy(() => import('views/collaborateur/archive/allEvaluation/cadre/AllCadre')));
const AllEvaluationNonCadre = Loadable(lazy(() => import('views/collaborateur/archive/allEvaluation/nonCadre/AllNonCadre')));
const AllCadreYear = Loadable(lazy(() => import('views/collaborateur/archive/allEvaluation/cadre/AllCadreYear')));
const AllNonCadreYear = Loadable(lazy(() => import('views/collaborateur/archive/allEvaluation/nonCadre/AllNonCadreYear')));
const AllCadreArchive = Loadable(lazy(() => import('views/collaborateur/archive/allEvaluation/cadre/AllCadreArchive')));
const AllNonCadreArchive = Loadable(lazy(() => import('views/collaborateur/archive/allEvaluation/nonCadre/AllNonCadreArchive')));

const MyEvaluation = Loadable(lazy(() => import('views/collaborateur/archive/MyEvaluation')));
const EvaluationPhasesCadre = Loadable(lazy(() => import('views/collaborateur/archive/cadre/EvaluationPhasesCadre')));
const EvaluationPhasesNonCadre = Loadable(lazy(() => import('views/collaborateur/archive/nonCadre/EvaluationPhasesNonCadre')));
//stat
const IndexCadre = Loadable(lazy(() => import('views/collaborateur/stat/cadre/index')));
const IndexNonCadre = Loadable(lazy(() => import('views/collaborateur/stat/nonCadre/index')));
//signature
const AssignSignature = Loadable(lazy(() => import('views/collaborateur/profile/Signature')));


//manager
const ListeSubordonne = Loadable(lazy(() => import('views/collaborateur/manager/Subordonne')));
const ManagerCadre = Loadable(lazy(() => import('views/collaborateur/manager/managerCadre/ManagerFo')));
const ManagerNonCadre = Loadable(lazy(() => import('views/collaborateur/manager/managerNonCadre/ManagerNFo')));



//test 
// const CollabFo = Loadable(lazy(() => import('views/test/cadreTest/collab/CollabFo')));
// const ManagerFo = Loadable(lazy(() => import('views/test/cadreTest/manager/ManagerFo')));
// const CollabNFo = Loadable(lazy(() => import('views/test/nonCadreTest/collab/CollabNFo')));
// const ManagerNFo = Loadable(lazy(() => import('views/test/nonCadreTest/manager/ManagerNFo')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: (
    <PrivateRoute>
      <MainLayout />
    </PrivateRoute>
  ),
  children: [
    {
      path: 'dashboard',
      children: [
        {
          path: 'default',
          element: (
            <PrivateRoute>
              <DashboardDefault />
            </PrivateRoute>
          )
        }
      ]
    },

    {
      path: 'habilitation',
      children: [
        {
          path: 'listeHabilitation',
          element: <ListeHabilitation />
        }
      ]
    },

    {
      path: 'habilitation',
      children: [
        {
          path: 'ajoutHabilitation',
          element: <AjoutHabilitation />
        }
      ]
    },

    {
      path: 'specification',
      children: [
        {
          path: 'listeSpec',
          element: <ListeSpec />
        }
      ]
    },

    {
      path: 'specification',
      children: [
        {
          path: 'ajoutSpec',
          element: <AjoutSpec />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'listeUtilisateur',
          element: <ListeUtilisateur />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'listeCadre',
          element: <ListeCadre />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'assignAllCadre',
          element: <AssignAllCadre />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'listeNonCadre',
          element: <ListeNonCadre />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'assignAllNonCadre',
          element: <AssignAllNonCadre />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'listeNonAutoriser',
          element: <ListeNonAutoriser />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'autorisation',
          element: <Autorisation />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'assignation/:userId',
          element: <Assignation />
        }
      ]
    },

    {
      path: 'utilisateur',
      children: [
        {
          path: 'assignationAll',
          element: <AssignationAll />
        }
      ]
    }, 

    {
      path: 'import',
      children: [
        {
          path: 'importCSV',
          element: <ImportCSV />
        }
      ]
    },

    {
      path: 'dashboardAdmin',
      children: [
        {
          path: 'dashboard',
          element: <DashboardAdmin />
        }
      ]
    }, 

    {
      path: 'evaluation',
      children: [
        {
          path: 'listeEvaluation',
          element: <ListeEval />
        }
      ]
    },

    {
      path: 'evaluation',
      children: [
        {
          path: 'ajoutEvaluation',
          element: <AjoutEval />
        }
      ]
    },

    {
      path: 'formulaireCadre',
      children: [
        {
          path: 'home',
          element: <FormulaireCadre />
        }
      ]
    },

    {
      path: 'formulaireNonCadre',
      children: [
        {
          path: 'home',
          element: <FormulaireNonCadre />
        }
      ]
    },

    //collab
    //profile
    {
      path: 'collab',
      children: [
        {
          path: 'profile',
          element: <Profile />
        }
      ]
    },
    //evaluation
    {
      path: 'evaluation',
      children: [
        {
          path: 'remplissage',
          element: <Remplissage />
        }
      ]
    },

    {
      path: 'evaluation',
      children: [
        {
          path: 'remplissageNonCadre',
          element: <RemplissageNonCadre />
        }
      ]
    },

    //manager

    {
      path: 'manager',
      children: [
        {
          path: 'subordonne',
          element: <ListeSubordonne />
        }
      ]
    },
    {
      path: 'manager',
      children: [
        {
          path: 'evaluationCadre/:subordinateId/:typeUser',
          element: <ManagerCadre />
        }
      ]
    },
    {
      path: 'manager',
      children: [
        {
          path: 'evaluationNonCadre/:subordinateId/:typeUser',
          element: <ManagerNonCadre />
        }
      ]
    },

    //archive
    {
      path: 'allEvaluation',
      children: [
        {
          path: 'cadre',
          element: <AllEvaluationCadre />
        }
      ]
    },
    {
      path: 'allEvaluation',
      children: [
        {
          path: 'nonCadre',
          element: <AllEvaluationNonCadre />
        }
      ]
    },
    {
      path: 'allEvaluation',
      children: [
        {
          path: 'cadreYear/:userId/:typeUser',
          element: <AllCadreYear />
        }
      ]
    },
    {
      path: 'allEvaluation',
      children: [
        {
          path: 'nonCadreYear/:userId/:typeUser',
          element: <AllNonCadreYear />
        }
      ]
    },
    {
      path: 'allEvaluation',
      children: [
        {
          path: 'cadreArchive/:userId/:evalId',
          element: <AllCadreArchive />
        }
      ]
    },
    {
      path: 'allEvaluation',
      children: [
        {
          path: 'nonCadreArchive/:userId/:evalId',
          element: <AllNonCadreArchive />
        }
      ]
    },
    {
      path: 'archive',
      children: [
        {
          path: 'myEvaluation',
          element: <MyEvaluation />
        }
      ]
    },
    {
      path: 'archive',
      children: [
        {
          path: 'evaluationPhasesCadre/:userId/:evalId',
          element: <EvaluationPhasesCadre />
        }
      ]
    },
    {
      path: 'archive',
      children: [
        {
          path: 'evaluationPhasesNonCadre/:userId/:evalId',
          element: <EvaluationPhasesNonCadre />
        }
      ]
    },

    //stat
    {
      path: 'stat',
      children: [
        {
          path: 'cadre/index/:userId/:typeUser',
          element: <IndexCadre />
        }
      ]
    },
    {
      path: 'stat',
      children: [
        {
          path: 'nonCadre/index/:userId/:typeUser',
          element: <IndexNonCadre />
        }
      ]
    },

//signature
    {
      path: 'signature',
      children: [
        {
          path: 'assign',
          element: <AssignSignature />
        }
      ]
    },
  ]
};

export default MainRoutes;
