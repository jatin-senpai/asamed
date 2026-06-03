'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatINR, formatPrecision, Unit } from '@/utils/conversions';

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  base_unit: Unit;
  base_price_inr: string;
  stock_quantity: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  
  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [baseUnit, setBaseUnit] = useState<Unit>('g');
  const [basePriceInr, setBasePriceInr] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  
  // Feedback messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('q', search);
      if (category) queryParams.append('category', category);
      
      const res = await fetch(`/api/products?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        
        // Extract unique categories
        const uniqueCategories: string[] = Array.from(new Set(data.map((p: Product) => p.category)));
        // Initialize once
        if (categories.length === 0) {
          setCategories(uniqueCategories);
        }
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingProductId(null);
    setSku('');
    setName('');
    setDescription('');
    setProductCategory('');
    setBaseUnit('g');
    setBasePriceInr('');
    setStockQuantity('0');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setModalMode('edit');
    setEditingProductId(product.id);
    setSku(product.sku);
    setName(product.name);
    setDescription(product.description || '');
    setProductCategory(product.category);
    setBaseUnit(product.base_unit);
    setBasePriceInr(product.base_price_inr);
    setStockQuantity(product.stock_quantity);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSuccessMsg(null);
    setErrorMsg(null);

    // Basic Validation
    if (!sku || !name || !basePriceInr || !stockQuantity) {
      setModalError('Please fill in all required fields.');
      return;
    }

    if (parseFloat(basePriceInr) < 0 || parseFloat(stockQuantity) < 0) {
      setModalError('Price and stock quantity must be non-negative values.');
      return;
    }

    const payload = {
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      description: description.trim(),
      category: productCategory.trim() || 'Uncategorized',
      base_unit: baseUnit,
      base_price_inr: parseFloat(basePriceInr),
      stock_quantity: parseFloat(stockQuantity)
    };

    try {
      const url = modalMode === 'create' ? '/api/products' : `/api/products/${editingProductId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(
          modalMode === 'create' 
            ? `Product "${payload.name}" successfully created.` 
            : `Product "${payload.name}" successfully updated.`
        );
        setIsModalOpen(false);
        fetchProducts();
      } else {
        setModalError(data.error || 'Failed to submit product details.');
      }
    } catch (err: any) {
      setModalError(err.message || 'An error occurred during submission.');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(`Product "${name}" successfully deleted.`);
        fetchProducts();
      } else {
        setErrorMsg(data.error || `Failed to delete product "${name}".`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during deletion.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Action Header & Filters */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search SKU or name..."
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
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="alert-banner alert-banner-success">
          <CheckCircle2 size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert-banner alert-banner-danger">
          <AlertTriangle size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{errorMsg}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-panel table-container">
        {loading ? (
          <div className="flex-center" style={{ padding: '4rem' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '0.5rem' }}>
            <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No products found in database.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Base Unit</th>
                <th>Base Rate (INR)</th>
                <th>Current Stock</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {product.sku}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {product.description || 'No description'}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
                      {product.category}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace' }}>{product.base_unit}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {formatINR(product.base_price_inr)}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {formatPrecision(product.stock_quantity, 4)} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{product.base_unit}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => openEditModal(product)} 
                        className="btn-icon" 
                        title="Edit Product"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id, product.name)} 
                        className="btn-icon" 
                        style={{ color: 'var(--danger)' }}
                        title="Delete Product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal - Create/Edit Product */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {modalMode === 'create' ? 'Create Product' : 'Modify Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="alert-banner alert-banner-danger" style={{ padding: '0.75rem', marginBottom: '1rem' }}>
                <AlertTriangle size={16} />
                <span style={{ fontSize: '0.8rem' }}>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">SKU (Code)*</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. CHEM-ASP-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Analgesics"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Product Name*</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Aspirin USP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea
                  className="input-field"
                  placeholder="Additional details..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ resize: 'none', fontFamily: 'var(--font-sans)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Base Unit*</label>
                  <select
                    className="input-field"
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value as Unit)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                    <option value="item">item</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Base Price (INR per Base Unit)*</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field"
                    placeholder="e.g. 1.50"
                    value={basePriceInr}
                    onChange={(e) => setBasePriceInr(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">Stock Quantity (in Base Unit)*</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input-field"
                  placeholder="e.g. 5000"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                >
                  Save Product
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
