'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, Calendar, Info, Eye, User } from 'lucide-react';
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
  order_type: 'quotation' | 'direct_buy';
  total_price_inr: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  items: OrderItem[];
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (data.length > 0 && !selectedOrder) {
          setSelectedOrder(data[0]); // Select first order by default
        }
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
      
      {/* Orders List Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} style={{ color: 'var(--primary)' }} />
            Received B2B Orders
          </h2>
        </div>

        {loading ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '0.5rem' }}>
            <ClipboardList size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No orders have been received for your products yet.</p>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Order #{order.id}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`} style={{ textTransform: 'capitalize' }}>
                        {order.status}
                      </span>
                      <span className="badge" style={{ 
                        background: order.order_type === 'direct_buy' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                        color: order.order_type === 'direct_buy' ? 'var(--accent)' : '#a78bfa',
                        border: order.order_type === 'direct_buy' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                        textTransform: 'capitalize',
                        fontSize: '0.7rem'
                      }}>
                        {order.order_type === 'direct_buy' ? 'Direct Buy' : 'Quotation'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                      Total: {formatINR(order.total_price_inr)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={14} />
                      <span>From: {order.user_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
                      <Eye size={14} />
                      <span>Details</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Audit Details Column */}
      <div className="glass-panel" style={{ padding: '2rem 1.5rem', height: 'fit-content', position: 'sticky', top: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={20} style={{ color: 'var(--primary)' }} />
          Order Calculations Audit
        </h2>

        {!selectedOrder ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem' }}>Select an order to view the conversion details and calculations.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Order Number:</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{selectedOrder.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Order Type:</span>
                <span className="badge" style={{ 
                  background: selectedOrder.order_type === 'direct_buy' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                  color: selectedOrder.order_type === 'direct_buy' ? 'var(--accent)' : '#a78bfa',
                  border: selectedOrder.order_type === 'direct_buy' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(139, 92, 246, 0.2)',
                  textTransform: 'capitalize',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>
                  {selectedOrder.order_type === 'direct_buy' ? 'Direct Buy' : 'Quotation'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Customer Name:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedOrder.user_name} ({selectedOrder.user_email})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Received Date:</span>
                <span style={{ fontSize: '0.85rem' }}>{formatDate(selectedOrder.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Order Status:</span>
                <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`} style={{ textTransform: 'capitalize' }}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Items List */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Purchased Items & Unit Conversions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedOrder.items && selectedOrder.items.map((item, idx) => {
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

                      {/* Calculations breakdown */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Ordered Qty:</span>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatPrecision(orderedQty, 2)} {item.unit}</span>
                        </div>
                        
                        {item.unit !== item.product_base_unit && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span>Conversion Factor:</span>
                              <span style={{ fontFamily: 'monospace' }}>× {formatPrecision(conversionFactor, 4)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span>Base Qty (Stock Deducted):</span>
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{formatPrecision(baseQty, 4)} {item.product_base_unit}</span>
                            </div>
                          </>
                        )}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Price at Order (INR):</span>
                          <span>{formatINR(basePrice)} / {item.product_base_unit}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.25rem', marginTop: '0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <span>Formula:</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                            {formatPrecision(baseQty, 2)} × {formatPrecision(basePrice, 2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Commission and Net Payout Breakdown */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', paddingBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Transaction Value (GMV):</span>
                <span>{formatINR(selectedOrder.total_price_inr)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--danger)' }}>
                <span>Platform Commission (5%):</span>
                <span>- {formatINR(new Big(selectedOrder.total_price_inr).times(0.05))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Your Net Payout (95%):</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{formatINR(new Big(selectedOrder.total_price_inr).times(0.95))}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong>B2B Fulfillment Note:</strong> The Admin oversees approvals and status modifications. Package the items matching the conversions audit above in the exact base stock quantities.
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
