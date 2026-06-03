'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Phone, MapPin, Check, MessageSquare, AlertTriangle, Eye, ArrowRight, User, Plus } from 'lucide-react';
import { formatPrecision, Unit, UNIT_LABELS } from '@/utils/conversions';

interface MedicineRequest {
  id: number;
  customer_name: string;
  phone_number: string;
  medicine_name: string;
  quantity: string;
  unit: Unit;
  address: string;
  status: 'pending' | 'contacted' | 'fulfilled';
  created_at: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<MedicineRequest | null>(null);
  
  // Feedback states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/medicine-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
        
        // Default select first or maintain selection
        if (data.length > 0) {
          if (selectedReq) {
            const updated = data.find((r: MedicineRequest) => r.id === selectedReq.id);
            if (updated) setSelectedReq(updated);
          } else {
            setSelectedReq(data[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (reqId: number, nextStatus: MedicineRequest['status']) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setStatusUpdating(true);

    try {
      const res = await fetch(`/api/medicine-requests/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Request #${reqId} status successfully updated to "${nextStatus}".`);
        await fetchRequests();
      } else {
        setErrorMsg(data.error || 'Failed to update request status.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during status update.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusBadgeClass = (status: MedicineRequest['status']) => {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'contacted': return 'badge-approved';
      case 'fulfilled': return 'badge-completed';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="grid-2col animate-fade-in">
      
      {/* Requests List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} style={{ color: 'var(--primary)' }} />
            Medicines Request Pipeline
          </h2>
          <button 
            onClick={fetchRequests}
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            Refresh
          </button>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="alert-banner alert-banner-success">
            <Check size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="alert-banner alert-banner-danger">
            <AlertTriangle size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{errorMsg}</span>
          </div>
        )}

        {/* List Content */}
        {loading ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading requested list...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '0.5rem' }}>
            <Bell size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No custom medicine requests received.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {requests.map(req => {
              const isSelected = selectedReq?.id === req.id;
              return (
                <div 
                  key={req.id} 
                  onClick={() => setSelectedReq(req)}
                  className="glass-panel"
                  style={{ 
                    padding: '1.25rem 1.5rem', 
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--card-border)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Request #{req.id}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(req.status)}`} style={{ textTransform: 'capitalize' }}>
                        {req.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {formatPrecision(req.quantity, 2)} {req.unit}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{req.medicine_name}</strong>
                      <span style={{ opacity: 0.5 }}>|</span>
                      <span>By: {req.customer_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', fontSize: '0.8rem' }}>
                      <Eye size={12} />
                      <span>Review Details</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Column */}
      <div className="glass-panel" style={{ padding: '2rem 1.5rem', height: 'fit-content', position: 'sticky', top: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} style={{ color: 'var(--primary)' }} />
          Request Coordinator Log
        </h2>

        {!selectedReq ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem' }}>Select a customer request from the list to display details and coordinates.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Request Details */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Requested Drug:</span>
                <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>{selectedReq.medicine_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Requested Quantity:</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {formatPrecision(selectedReq.quantity, 4)} {selectedReq.unit} ({UNIT_LABELS[selectedReq.unit]})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Customer Name:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedReq.customer_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Phone Number:</span>
                <a 
                  href={`tel:${selectedReq.phone_number}`}
                  style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Phone size={12} />
                  {selectedReq.phone_number}
                </a>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Submitted Date:</span>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(selectedReq.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current Status:</span>
                <span className={`badge ${getStatusBadgeClass(selectedReq.status)}`} style={{ textTransform: 'capitalize' }}>
                  {selectedReq.status}
                </span>
              </div>
            </div>

            {/* Address Panel */}
            <div style={{ background: 'rgba(7, 11, 19, 0.4)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                <MapPin size={12} style={{ color: 'var(--danger)' }} />
                Delivery Address:
              </span>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                {selectedReq.address}
              </p>
            </div>

            {/* Status updates */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Update Request Status:
              </span>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedReq.status === 'pending' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedReq.id, 'contacted')}
                    disabled={statusUpdating}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                  >
                    <MessageSquare size={14} /> Mark Contacted
                  </button>
                )}

                {selectedReq.status === 'contacted' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedReq.id, 'fulfilled')}
                    disabled={statusUpdating}
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                  >
                    <Check size={14} /> Mark Fulfilled
                  </button>
                )}

                {selectedReq.status === 'fulfilled' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}>
                    <Check size={14} style={{ color: 'var(--primary)' }} />
                    <span>Request has been completed and drug supplied.</span>
                  </div>
                )}
                
                {selectedReq.status !== 'pending' && selectedReq.status !== 'fulfilled' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedReq.id, 'pending')}
                    disabled={statusUpdating}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Integration */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Catalog Integration:
              </span>
              <a 
                href={`/dashboard/admin/products?prefill_name=${encodeURIComponent(selectedReq.medicine_name)}&prefill_unit=${selectedReq.unit}&prefill_desc=${encodeURIComponent(`Requested by ${selectedReq.customer_name} (${selectedReq.phone_number}).`)}`}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.5rem', fontSize: '0.8rem', textDecoration: 'none', width: '100%' }}
              >
                <Plus size={14} /> Add to Catalog Inventory
              </a>
            </div>

            {/* Coordinator Instructions */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <strong>Coordinator Guideline:</strong> Call the customer at the provided phone number to confirm details. Next, cross-reference with catalog sellers to procure the drug and update status to reflect progress.
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
