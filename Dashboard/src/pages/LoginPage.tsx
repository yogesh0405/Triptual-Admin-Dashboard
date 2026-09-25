import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { login } from '../api';
import './LoginPage.css';

interface LoginPageProps { onLogin: (email: string) => void; }

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setIsSubmitting(true);
    try { const admin = await login(email, password); onLogin(admin.email); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <div className="login-logo-container">
            <img src="/triptual-logo.png" alt="Triptual Logo" className="login-logo-img" />
          </div>
          <div className="login-brand-text">
            <span className="login-brand-name">TRIPTUAL</span>
            <span className="login-brand-tag">ADMIN</span>
          </div>
        </div>
        <div className="login-kicker"><ShieldCheck size={14} /> Admin control center</div>
        <h1>Welcome back.</h1>
        <p className="login-intro">Sign in to manage travelers and read live platform analytics.</p>
        <form onSubmit={submit} className="login-form" autoComplete="off">
          <label>
            Email address
            <div className="login-input">
              <Mail size={16} />
              <input
                type="email"
                name="admin-email"
                placeholder="admin@triptual.com"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>
          <label>
            Password
            <div className="login-input">
              <LockKeyhole size={16} />
              <input
                type="password"
                name="admin-password"
                placeholder="Enter your password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="btn btn-primary login-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} />
          </button>
        </form>
        <p className="login-note">Access is protected with short-lived JWT access tokens and revocable refresh sessions.</p>
      </section>
      <aside className="login-aside">
        <div className="login-aside-copy">
          <h2>See the journey behind every journey.</h2>
          <p>One calm workspace for your traveler community, live performance, and the decisions that keep trips moving.</p>
        </div>
      </aside>
    </main>
  );
};

export default LoginPage;