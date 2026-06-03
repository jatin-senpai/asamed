'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Calendar, Check, X, CheckSquare, RefreshCw, Eye, ArrowRight, User, CheckCircle2 } from 'lucide-react';
import { formatINR, formatPrecision, Unit } from '@/utils/conversions';
import Big from 'big.js';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  product_base_unit: Unit;
  product_base_price: string;
  quantity: string;
  unit: Unit;
  calculated_price_inr: string;
  base_price_at_order: string;
  conversion_factor_used: string;
}

interface Order {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  total_price_inr: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Feedback notices
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const getCommissionMetrics = () => {
    let grossVolume = new Big(0);
    let commissionEarned = new Big(0);
    let completedVolume = new Big(0);
    let completedCommission = new Big(0);

    orders.forEach(order => {
      const amt = new Big(order.total_price_inr || 0);
      grossVolume = grossVolume.plus(amt);
      
      const comm = amt.times(0.05);
      commissionEarned = commissionEarned.plus(comm);

      if (order.status === 'completed' || order.status === 'approved') {
        completedVolume = completedVolume.plus(amt);
        completedCommission = completedCommission.plus(comm);
      }
    });

    return { grossVolume, commissionEarned, completedVolume, completedCommission };
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        
        // Keep selection updated or default to first
        if (data.length > 0) {
          if (selectedOrder) {
            const updated = data.find((o: Order) => o.id === selectedOrder.id);
            if (updated) setSelectedOrder(updated);
          } else {
            setSelectedOrder(data[0]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: number, nextStatus: Order['status']) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setStatusUpdating(true);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Order #${orderId} status successfully updated to "${nextStatus}".`);
        await fetchOrders();
      } else {
        setErrorMsg(data.error || 'Failed to update order status.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during status update.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'badge-pending';
      case 'approved': return 'badge-approved';
      case 'completed': return 'badge-completed';
      case 'rejected': return 'badge-rejected';
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
      
      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} style={{ color: 'var(--primary)' }} />
            Quotations & Order Stream
          </h2>
          <button 
            onClick={fetchOrders}
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} />
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
            <X size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{errorMsg}</span>
          </div>
        )}

        {/* Earnings & Transaction Summary KPI Cards */}
        {!loading && orders.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gross Volume (GMV)</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {formatINR(getCommissionMetrics().grossVolume)}
              </strong>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total all quotations placed</span>
            </div>
            
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Commission Booked (5%)</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                {formatINR(getCommissionMetrics().commissionEarned)}
              </strong>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>From total bookings</span>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Fulfill Volume (Cleared)</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                {formatINR(getCommissionMetrics().completedVolume)}
              </strong>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Approved/Completed orders</span>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Net Revenue (5%)</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>
                {formatINR(getCommissionMetrics().completedCommission)}
              </strong>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Net platform earnings</span>
            </div>
          </div>
        )}

        {/* List Content */}
        {loading ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading order stream...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '0.5rem' }}>
            <ShieldAlert size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No incoming orders/quotations found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
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
                        Order #{order.id}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`} style={{ textTransform: 'capitalize' }}>
                        {order.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatINR(order.total_price_inr)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        <User size={12} />
                        {order.user_name}
                      </span>
                      <span style={{ opacity: 0.5 }}>|</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        <Calendar size={12} />
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
                      <Eye size={12} />
                      <span>Audit conversions</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit & Management Detail Column */}
      <div className="glass-panel" style={{ padding: '2rem 1.5rem', height: 'fit-content', position: 'sticky', top: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} style={{ color: 'var(--primary)' }} />
          Admin Verification Log
        </h2>

        {!selectedOrder ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem' }}>Select an order to inspect quantities, base prices, conversion formulas, and adjust approval states.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Quotation:</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Order #{selectedOrder.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Seller Name:</span>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{selectedOrder.user_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Seller Email:</span>
                <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{selectedOrder.user_email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Date Received:</span>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(selectedOrder.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current Status:</span>
                <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`} style={{ textTransform: 'capitalize' }}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div style={{ borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)', padding: '1rem 0' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                Adjust Order Status:
              </span>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedOrder.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'approved')}
                      disabled={statusUpdating}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'rejected')}
                      disabled={statusUpdating}
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </>
                )}

                {selectedOrder.status === 'approved' && (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                      disabled={statusUpdating}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                    >
                      <CheckSquare size={14} /> Complete
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'rejected')}
                      disabled={statusUpdating}
                      className="btn btn-danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', flex: 1 }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </>
                )}

                {selectedOrder.status === 'rejected' && (
                  <button 
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'pending')}
                    disabled={statusUpdating}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
                  >
                    Restore to Pending
                  </button>
                )}

                {selectedOrder.status === 'completed' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%' }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--primary)' }} />
                    <span>This transaction is fully completed and locked.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Verification Audit */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Line-Item Conversion Audits</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedOrder.items.map((item, idx) => {
                  const orderedQty = new Big(item.quantity);
                  const conversionFactor = new Big(item.conversion_factor_used);
                  const baseQty = orderedQty.times(conversionFactor);
                  const basePrice = new Big(item.base_price_at_order);
                  const calculatedPrice = new Big(item.calculated_price_inr);

                  return (
                    <div 
                      key={item.id || idx} 
                      style={{ 
                        background: 'rgba(7, 11, 19, 0.4)', 
                        padding: '1rem', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--card-border)' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.product_name}</h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {item.product_sku}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                          {formatINR(calculatedPrice)}
                        </span>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Ordered Unit & Qty:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>{formatPrecision(orderedQty, 2)} {item.unit}</strong>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Base Unit (Internal):</span>
                          <span>{item.product_base_unit}</span>
                        </div>

                        {item.unit !== item.product_base_unit ? (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Conversion Ratio:</span>
                              <span style={{ fontFamily: 'monospace' }}>1 {item.unit} = {formatPrecision(conversionFactor, 4)} {item.product_base_unit}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                              <span>Audit Converted Qty:</span>
                              <span>{formatPrecision(baseQty, 6)} {item.product_base_unit}</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                            <span>Audit Direct Qty:</span>
                            <span>{formatPrecision(baseQty, 6)} {item.product_base_unit}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Configured Base Rate:</span>
                          <span>{formatINR(basePrice)} / {item.product_base_unit}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <span>Verification Formula:</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {formatPrecision(baseQty, 4)} × {formatINR(basePrice)} = {formatINR(calculatedPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Commission and Payout breakdown */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Transaction Value (GMV):</span>
                <span>{formatINR(selectedOrder.total_price_inr)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>
                <span>Platform Commission (5%):</span>
                <span>+ {formatINR(new Big(selectedOrder.total_price_inr).times(0.05))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Seller Payout Share (95%):</span>
                <span>{formatINR(new Big(selectedOrder.total_price_inr).times(0.95))}</span>
              </div>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Total Customer Invoice:</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{formatINR(selectedOrder.total_price_inr)}</strong>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
