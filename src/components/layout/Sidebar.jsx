import { NavLink } from 'react-router-dom';
import { resources } from '../../constants/resourceConfig';
import './Sidebar.css';

const Sidebar = () => (
  <aside className="sidebar">
    <div className="sidebar-header">
      <span className="sidebar-logo">Mintaka</span>
      <span className="sidebar-version">Manager</span>
    </div>
    <nav className="sidebar-nav">
      {resources.map((resource) => (
        <NavLink
          key={resource.key}
          to={`/manage/${resource.key}`}
          className={({ isActive }) =>
            isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
          }
        >
          <span>{resource.label}</span>
        </NavLink>
      ))}
      <NavLink
        to="/expedientes"
        className={({ isActive }) =>
          isActive ? 'sidebar-link sidebar-link-active' : 'sidebar-link'
        }
      >
        <span>Expedientes</span>
      </NavLink>
    </nav>
  </aside>
);

export default Sidebar;
