import { createBrowserRouter } from 'react-router-dom';

// routes
import MainRoutes from './MainRoutes';
import LoginRoutes from './AuthenticationRoutes';

// ==============================|| ROUTING RENDER ||============================== //
const router = createBrowserRouter([LoginRoutes,MainRoutes], {
  basename: import.meta.env.VITE_APP_BASE_NAME
});

export default router;
