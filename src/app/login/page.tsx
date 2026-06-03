'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Eye, EyeOff, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Database status states
  const [dbStatus, setDbStatus] = useState<{ initialized: boolean; message: string } | null>(null);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [dbSuccessMessage, setDbSuccessMessage] = useState<string | null>(null);

  // Check if database needs setup
  useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch('/api/db-init');
        const data = await res.json();
        setDbStatus({
          initialized: !!data.initialized,
          message: data.message || 'Database status retrieved.'
        });
      } catch (e) {
        setDbStatus({
          initialized: false,
          message: 'Could not connect to database API. Make sure DATABASE_URL is set.'
        });
      }
    }
    checkDb();
  }, []);

  const handleInitDb = async () => {
    setIsInitializingDb(true);
    setError(null);
    setDbSuccessMessage(null);
    try {
      const res = await fetch('/api/db-init?reset=true');
      const data = await res.json();
      if (res.ok) {
        setDbStatus({ initialized: true, message: 'Initialized' });
        setDbSuccessMessage('Database tables successfully generated and test data seeded!');
      } else {
        setError(data.error || 'Failed to initialize database.');
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred while connecting to database.');
    } finally {
      setIsInitializingDb(false);
    }
  };

  const handlePrefill = (role: 'admin' | 'seller') => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@asamed.com');
      setPassword('admin123');
    } else {
      setEmail('seller@asamed.com');
      setPassword('seller123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid credentials');
    }
  };

  return (
    <main className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '440px' }}>
        
        {/* Logo/Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Aasa<span style={{ color: 'var(--primary)' }}>MedChem</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Inventory & Order Management System
          </p>
        </div>

        {/* Database setup prompt if not initialized */}
        {dbStatus && !dbStatus.initialized && (
          <div className="glass-panel alert-banner alert-banner-danger" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle style={{ minWidth: '18px', marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>Database Setup Required</strong>
                <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>Tables and test data are not initialized in Neon PostgreSQL.</span>
              </div>
            </div>
            <button 
              onClick={handleInitDb}
              disabled={isInitializingDb}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', alignSelf: 'flex-start' }}
            >
              <Database size={14} />
              {isInitializingDb ? 'Initializing Tables...' : 'Initialize & Seed Database'}
            </button>
          </div>
        )}

        {/* Database Success Notification */}
        {dbSuccessMessage && (
          <div className="alert-banner alert-banner-success" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.85rem' }}>{dbSuccessMessage}</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="alert-banner alert-banner-danger" style={{ marginBottom: '1.5rem' }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: '0.85rem' }}>{error}</span>
          </div>
        )}

        {/* Main Login Form Card */}
        <div className="glass-panel" style={{ padding: '2.25rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Shield style={{ color: 'var(--primary)' }} size={20} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Secure Login</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="e.g. admin@asamed.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Credentials Prefill Card */}
        <div 
          className="glass-panel" 
          style={{ 
            marginTop: '1.5rem', 
            padding: '1.25rem 1.5rem', 
            background: 'rgba(22, 34, 56, 0.2)',
            borderStyle: 'dashed'
          }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
            Demo / Evaluator Quick Access
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => handlePrefill('admin')}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
            >
              Prefill Admin
            </button>
            <button
              type="button"
              onClick={() => handlePrefill('seller')}
              className="btn btn-secondary"
              style={{ padding: '0.5rem', fontSize: '0.8rem', justifyContent: 'center' }}
            >
              Prefill Seller
            </button>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div>Admin: <code style={{ color: 'var(--text-secondary)' }}>admin@asamed.com</code> / <code style={{ color: 'var(--text-secondary)' }}>admin123</code></div>
            <div>Seller: <code style={{ color: 'var(--text-secondary)' }}>seller@asamed.com</code> / <code style={{ color: 'var(--text-secondary)' }}>seller123</code></div>
          </div>
        </div>

      </div>
    </main>
  );
}
