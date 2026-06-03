'use client';

import React, { useState, useEffect } from 'react';
import { Beaker, Search, ShoppingCart, Trash2, ArrowRight, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { 
  getCompatibleUnits, 
  calculateTotalPrice, 
  convertQuantity,
  formatINR, 
  formatPrecision, 
  Unit, 
  UNIT_LABELS 
} from '@/utils/conversions';
import Big from 'big.js';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  base_unit: Unit;
  base_price_inr: string; // numeric comes as string from database
  stock_quantity: string;
  seller_name?: string;
  seller_email?: string;
}

interface CartItem {
  product: Product;
  quantity: string; // Keep as string for input flexibility
  unit: Unit;
}

export default function UserProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderStatus, setOrderStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Medicine request state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqCustomerName, setReqCustomerName] = useState('');
  const [reqPhoneNumber, setReqPhoneNumber] = useState('');
  const [reqMedicineName, setReqMedicineName] = useState('');
  const [reqQuantity, setReqQuantity] = useState('');
  const [reqUnit, setReqUnit] = useState<Unit>('g');
  const [reqAddress, setReqAddress] = useState('');
  const [reqSubmitError, setReqSubmitError] = useState<string | null>(null);
  const [reqSubmitSuccess, setReqSubmitSuccess] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('q', search);
      if (category) queryParams.append('category', category);
      
      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        
        // Extract categories for filter
        const uniqueCategories: string[] = Array.from(new Set(data.map((p: Product) => p.category)));
        if (categories.length === 0) {
          setCategories(uniqueCategories);
        }
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const handleOpenRequestModal = (medName = '') => {
    setReqMedicineName(medName || search || '');
    setReqCustomerName('');
    setReqPhoneNumber('');
    setReqQuantity('1');
    setReqUnit('g');
    setReqAddress('');
    setReqSubmitError(null);
    setReqSubmitSuccess(null);
    setIsRequestModalOpen(true);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqSubmitError(null);
    setReqSubmitSuccess(null);

    if (!reqCustomerName || !reqPhoneNumber || !reqMedicineName || !reqQuantity || !reqUnit || !reqAddress) {
      setReqSubmitError('All fields are required.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await fetch('/api/medicine-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: reqCustomerName,
          phoneNumber: reqPhoneNumber,
          medicineName: reqMedicineName,
          quantity: reqQuantity,
          unit: reqUnit,
          address: reqAddress
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReqSubmitSuccess(`Request for "${reqMedicineName}" submitted successfully to the admin!`);
        setReqCustomerName('');
        setReqPhoneNumber('');
        setReqAddress('');
        setReqMedicineName('');
        setReqQuantity('');
      } else {
        setReqSubmitError(data.error || 'Failed to submit request.');
      }
    } catch (err) {
      setReqSubmitError('Network error occurred.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const exists = cart.find(item => item.product.id === product.id);
    if (exists) return;

    setCart([...cart, { 
      product, 
      quantity: '1', 
      unit: product.base_unit 
    }]);
    setOrderStatus(null);
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleCartQtyChange = (productId: number, qtyString: string) => {
    if (qtyString !== '' && !/^\d*\.?\d*$/.test(qtyString)) return;

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: qtyString };
      }
      return item;
    }));
  };

  const handleCartUnitChange = (productId: number, newUnit: Unit) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, unit: newUnit };
      }
      return item;
    }));
  };

  const getCartItemBreakdown = (item: CartItem) => {
    const qtyStr = item.quantity || '0';
    let baseQty = new Big(0);
    let totalPrice = new Big(0);
    let hasError = false;
    let isStockExceeded = false;
    let errorMsg = '';

    try {
      if (qtyStr !== '' && parseFloat(qtyStr) > 0) {
        baseQty = convertQuantity(qtyStr, item.unit, item.product.base_unit);
        totalPrice = calculateTotalPrice(
          qtyStr,
          item.unit,
          item.product.base_unit,
          item.product.base_price_inr
        );

        const availableStock = new Big(item.product.stock_quantity);
        if (baseQty.gt(availableStock)) {
          isStockExceeded = true;
          errorMsg = `Exceeds stock limit (${formatPrecision(availableStock, 2)} ${item.product.base_unit})`;
        }
      } else if (qtyStr !== '') {
        hasError = true;
        errorMsg = 'Quantity must be greater than zero';
      }
    } catch (e) {
      hasError = true;
      errorMsg = 'Invalid quantity';
    }

    return { baseQty, totalPrice, hasError, isStockExceeded, errorMsg };
  };

  const getCartTotals = () => {
    let grandTotal = new Big(0);
    let totalItemsCount = 0;
    let hasErrors = false;
    let hasStockErrors = false;

    cart.forEach(item => {
      const { totalPrice, hasError, isStockExceeded } = getCartItemBreakdown(item);
      grandTotal = grandTotal.plus(totalPrice);
      totalItemsCount += (item.quantity && parseFloat(item.quantity) > 0) ? 1 : 0;
      if (hasError) hasErrors = true;
      if (isStockExceeded) hasStockErrors = true;
    });

    return { grandTotal, totalItemsCount, hasErrors, hasStockErrors };
  };

  const handlePlaceOrder = async (orderType: 'direct_buy' | 'quotation') => {
    const { hasErrors, hasStockErrors } = getCartTotals();
    if (hasErrors) {
      setOrderStatus({ success: false, message: 'Please resolve quantity errors in the cart before proceeding.' });
      return;
    }

    if (orderType === 'direct_buy' && hasStockErrors) {
      setOrderStatus({ success: false, message: 'Direct Buy is not allowed when quantity exceeds available stock.' });
      return;
    }

    const orderItems = cart
      .filter(item => item.quantity && parseFloat(item.quantity) > 0)
      .map(item => ({
        productId: item.product.id,
        quantity: parseFloat(item.quantity),
        unit: item.unit
      }));

    if (orderItems.length === 0) {
      setOrderStatus({ success: false, message: 'Cart items must have a quantity greater than zero.' });
      return;
    }

    setSubmittingOrder(true);
    setOrderStatus(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems, orderType })
      });
      const data = await res.json();
      
      if (res.ok) {
        setOrderStatus({
          success: true,
          message: orderType === 'direct_buy'
            ? `Order purchased successfully! Order ID: #${data.orderId}. Total paid: ${formatINR(data.totalPriceInr)}.`
            : `Quotation requested successfully! Order ID: #${data.orderId}. Total quote: ${formatINR(data.totalPriceInr)}.`
        });
        setCart([]); // Clear cart
        fetchProducts(); // Refresh stock quantities on catalog
      } else {
        setOrderStatus({
          success: false,
          message: data.error || 'Failed to place order.'
        });
      }
    } catch (e) {
      setOrderStatus({
        success: false,
        message: 'Network error occurred while submitting order.'
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const { grandTotal, hasErrors, hasStockErrors } = getCartTotals();

  return (
    <div className="grid-2col">
      {/* Catalog Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Search & Filters */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by product name, SKU..."
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div style={{ width: '180px' }}>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button 
            type="button"
            onClick={() => handleOpenRequestModal()} 
            className="btn btn-secondary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Request Custom Medicine
          </button>
        </div>

        {/* Order placing notification */}
        {orderStatus && (
          <div className={`alert-banner ${orderStatus.success ? 'alert-banner-success' : 'alert-banner-danger'}`}>
            {orderStatus.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{orderStatus.message}</span>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading catalog...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="glass-panel flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
            <HelpCircle size={32} style={{ color: 'var(--text-muted)' }} />
            <div>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>No medicines matched your search.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>If a medicine is unavailable, you can submit a request directly to the Admin.</p>
            </div>
            <button 
              onClick={() => handleOpenRequestModal(search)}
              className="btn btn-primary"
              style={{ marginTop: '0.5rem' }}
            >
              Request "{search || 'Medicine'}"
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {products.map(product => {
              const inCart = cart.some(item => item.product.id === product.id);
              const isOutOfStock = parseFloat(product.stock_quantity) <= 0;
              return (
                <div key={product.id} className="glass-panel glass-panel-interactive" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
                      {product.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {product.sku}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {product.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                    Seller: {product.seller_name || 'AasaMedChem Core'}
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', flex: 1, lineHeight: 1.4 }}>
                    {product.description || 'No description provided.'}
                  </p>

                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Base Rate:</span>
                      <strong style={{ color: 'var(--primary)' }}>
                        {formatINR(product.base_price_inr)} / {product.base_unit}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Available Stock:</span>
                      <span style={{ color: isOutOfStock ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 500 }}>
                        {isOutOfStock ? 'Out of stock' : `${formatPrecision(product.stock_quantity, 2)} ${product.base_unit}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={inCart || isOutOfStock}
                    className={`btn ${inCart ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%', padding: '0.6rem' }}
                  >
                    {inCart ? 'Added to Cart' : isOutOfStock ? 'Out of stock' : 'Add to Cart'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Column */}
      <div className="glass-panel" style={{ padding: '2rem 1.5rem', height: 'fit-content', position: 'sticky', top: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
          <ShoppingCart style={{ color: 'var(--primary)' }} size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Shopping Cart</h2>
          <span className="badge" style={{ background: 'var(--primary-glow)', color: 'var(--primary)', marginLeft: 'auto' }}>
            {cart.length}
          </span>
        </div>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <ShoppingCart size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.9rem' }}>Your shopping cart is empty.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Add products from the catalog to buy directly or request a quotation.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {cart.map(item => {
                const compatibleUnits = getCompatibleUnits(item.product.base_unit);
                const { baseQty, totalPrice, hasError, isStockExceeded, errorMsg } = getCartItemBreakdown(item);
                
                return (
                  <div key={item.product.id} className="glass-panel" style={{ padding: '1rem', background: 'rgba(7, 11, 19, 0.4)', borderColor: hasError ? 'rgba(239, 68, 68, 0.3)' : 'var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.product.name}</h4>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Seller: {item.product.seller_name || 'Core'}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="btn-icon" 
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => handleCartQtyChange(item.product.id, e.target.value)}
                        className="input-field"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleCartUnitChange(item.product.id, e.target.value as Unit)}
                        className="input-field"
                        style={{ padding: '0.4rem 0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        {compatibleUnits.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    {/* Conversion Math & Audit */}
                    {item.quantity && parseFloat(item.quantity) > 0 && (
                      <div style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                        
                        {/* Audit Details */}
                        {item.unit !== item.product.base_unit ? (
                          <div style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span>Unit Conversion:</span>
                            <span style={{ fontFamily: 'monospace' }}>
                              {item.quantity} {item.unit} = {formatPrecision(baseQty, 4)} {item.product.base_unit}
                            </span>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span>Stock Quantity:</span>
                            <span style={{ fontFamily: 'monospace' }}>
                              {formatPrecision(baseQty, 4)} {item.product.base_unit}
                            </span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, color: 'var(--text-primary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                          <span>Calculated Price:</span>
                          <span style={{ color: 'var(--primary)' }}>
                            {formatINR(totalPrice)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error and Warning Messages */}
                    {hasError && (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 500, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={12} />
                        {errorMsg}
                      </div>
                    )}
                    {isStockExceeded && (
                      <div style={{ color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 500, marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={12} />
                          <span>{errorMsg}</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '1rem' }}>
                          Allowed for Quotation, but blocks Direct Buy.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cart Summary */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items Count:</span>
                <span style={{ fontWeight: 600 }}>{cart.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '1.15rem' }}>
                <span style={{ fontWeight: 600 }}>Grand Total:</span>
                <strong style={{ color: 'var(--primary)', fontSize: '1.35rem' }}>{formatINR(grandTotal)}</strong>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => handlePlaceOrder('direct_buy')}
                  disabled={submittingOrder || hasErrors || hasStockErrors || cart.length === 0}
                  className="btn btn-primary"
                  style={{ width: '100%', gap: '0.5rem', justifyContent: 'center' }}
                >
                  {submittingOrder ? 'Submitting...' : 'Direct Buy (Instant)'}
                  <ArrowRight size={16} />
                </button>
                
                <button
                  onClick={() => handlePlaceOrder('quotation')}
                  disabled={submittingOrder || hasErrors || cart.length === 0}
                  className="btn btn-secondary"
                  style={{ 
                    width: '100%', 
                    gap: '0.5rem', 
                    justifyContent: 'center',
                    borderColor: 'var(--primary)',
                    color: 'var(--primary)',
                    background: 'transparent'
                  }}
                >
                  {submittingOrder ? 'Submitting...' : 'Request Quotation'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Request Unavailable Medicine */}
      {isRequestModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content" style={{ maxWidth: '520px' }}>
            
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Request Unavailable Medicine
              </h2>
              <button 
                type="button"
                onClick={() => setIsRequestModalOpen(false)} 
                className="modal-close"
                style={{ fontSize: '1.25rem' }}
              >
                &times;
              </button>
            </div>

            {reqSubmitSuccess && (
              <div className="alert-banner alert-banner-success" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={16} />
                <span style={{ fontSize: '0.8rem' }}>{reqSubmitSuccess}</span>
              </div>
            )}

            {reqSubmitError && (
              <div className="alert-banner alert-banner-danger" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span style={{ fontSize: '0.8rem' }}>{reqSubmitError}</span>
              </div>
            )}

            <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Display Name*</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. John Doe"
                    value={reqCustomerName}
                    onChange={(e) => setReqCustomerName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number*</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. +91 9988776655"
                    value={reqPhoneNumber}
                    onChange={(e) => setReqPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Requested Medicine Name*</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Paracetamol 650mg"
                  value={reqMedicineName}
                  onChange={(e) => setReqMedicineName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Required Quantity*</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field"
                    placeholder="e.g. 50"
                    value={reqQuantity}
                    onChange={(e) => setReqQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantity Unit*</label>
                  <select
                    className="input-field"
                    value={reqUnit}
                    onChange={(e) => setReqUnit(e.target.value as Unit)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                    <option value="item">item</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Delivery Address*</label>
                <textarea
                  className="input-field"
                  placeholder="Street, City, Pincode..."
                  rows={3}
                  value={reqAddress}
                  onChange={(e) => setReqAddress(e.target.value)}
                  required
                  style={{ resize: 'none', fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsRequestModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={submittingRequest}
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
