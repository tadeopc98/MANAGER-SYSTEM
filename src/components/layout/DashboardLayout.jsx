import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './DashboardLayout.css';

const DashboardLayout = () => (
  <div className="dashboard-shell">
    <Sidebar />
    <div className="dashboard-main">
      <TopBar />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  </div>
);

export default DashboardLayout;
