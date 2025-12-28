import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Approvals from './pages/Approvals';
import KillSwitch from './pages/KillSwitch';
import AuditExplorer from './pages/AuditExplorer';

function App() {
  return (
    <div className="app">
      <Nav />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Approvals />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/killswitch" element={<KillSwitch />} />
          <Route path="/audit" element={<AuditExplorer />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
