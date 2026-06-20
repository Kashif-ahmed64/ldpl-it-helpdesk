import { HeadphonesIcon } from 'lucide-react';
import { isSupabaseConfigured } from './config/supabase';
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <HeadphonesIcon size={28} strokeWidth={2} aria-hidden />
          <div>
            <p className="app-header__org">Liberty Daharki Powers Ltd</p>
            <h1 className="app-header__title">IT Helpdesk</h1>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="card welcome-card">
          <span className="badge badge--red">Scaffold ready</span>
          <h2>Project setup complete</h2>
          <p className="welcome-card__text">
            The LDPL IT Helpdesk scaffold is ready. Pages for System Admin, IT Staff,
            and Employees will be added in upcoming prompts.
          </p>

          <ul className="welcome-card__structure">
            <li><code>src/pages/admin</code> — System Admin</li>
            <li><code>src/pages/it</code> — IT Staff</li>
            <li><code>src/pages/employee</code> — Employees</li>
          </ul>

          <p className="welcome-card__status">
            Supabase:{' '}
            <span className={`badge ${isSupabaseConfigured ? 'badge--navy' : 'badge--red'}`}>
              {isSupabaseConfigured ? 'Configured' : 'Not configured — add .env'}
            </span>
          </p>
        </div>
      </main>

      <footer className="app-footer">
        <p>LDPL IT Helpdesk &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
