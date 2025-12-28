import { NavLink } from 'react-router-dom';

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">
        AgentOS <span>Ops Console</span>
      </div>
      <div className="nav-links">
        <NavLink
          to="/approvals"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          Approvals
        </NavLink>
        <NavLink
          to="/killswitch"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          Kill Switch
        </NavLink>
        <NavLink
          to="/audit"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          Audit Explorer
        </NavLink>
      </div>
    </nav>
  );
}

export default Nav;
