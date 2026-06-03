'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Beaker, ClipboardList, LogOut } from 'lucide-react';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.1rem' }}>Loading session...</p>
        </div>
      </div>
    );
  }

  // Next.js middleware protects this, but check as a safety net
  if (!user || user.role !== 'seller') {
    return null;
  }

  return (
    <div className="dashboard-grid">
      <aside className="dashboard-sidebar">
        <div className="sidebar-title">
          <Beaker size={24} style={{ color: 'var(--primary)' }} />
          Aasa<span>MedChem</span>
        </div>
        
        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            <li>
              <Link 
                href="/dashboard/seller/products" 
                className={`sidebar-link ${pathname.startsWith('/dashboard/seller/products') ? 'active' : ''}`}
              >
                <Beaker size={18} />
                Products Catalog
              </Link>
            </li>
            <li>
              <Link 
                href="/dashboard/seller/orders" 
                className={`sidebar-link ${pathname.startsWith('/dashboard/seller/orders') ? 'active' : ''}`}
              >
                <ClipboardList size={18} />
                Order History
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', gap: '0.75rem' }}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      
      <main className="dashboard-main animate-fade-in">
        <header className="header-bar">
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Seller Portal</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Browse inventory and generate precise quotations.</p>
          </div>
          <div className="header-user-badge">
            <div className="header-user-icon">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
        </header>
        
        {children}
      </main>
    </div>
  );
}
