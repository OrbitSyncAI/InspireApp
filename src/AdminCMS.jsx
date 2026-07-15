import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './version';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AdminCMS({ triggerToast }) {
  const [activeTab, setActiveTab] = useState('quotes'); // 'quotes' or 'categories'
  const [categories, setCategories] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [busy, setBusy] = useState(false);

  const fetchCategories = async () => {
    setBusy(true);
    const { data, error } = await supabase.from('app_categories').select('*').order('created_at', { ascending: false });
    if (!error && data) setCategories(data);
    setBusy(false);
  };

  const fetchQuotes = async () => {
    setBusy(true);
    const { data, error } = await supabase.from('app_quotes').select('*').order('created_at', { ascending: false });
    if (!error && data) setQuotes(data);
    setBusy(false);
  };

  useEffect(() => {
    fetchCategories();
    fetchQuotes();
  }, []);

  // Quote form state
  const [quoteForm, setQuoteForm] = useState({ id: null, text: '', author: 'Sohel Khan', category_ids: [] });
  const [categoryForm, setCategoryForm] = useState({ id: null, label: '', emoji: '✨', gradient_start: '#667EEA', gradient_end: '#764BA2' });
  
  const saveQuote = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = { text: quoteForm.text, author: quoteForm.author, category_ids: quoteForm.category_ids };
    
    if (quoteForm.id) {
      const { error } = await supabase.from('app_quotes').update(payload).eq('id', quoteForm.id);
      if (error) triggerToast('Error updating quote');
      else triggerToast('Quote updated!');
    } else {
      const { error } = await supabase.from('app_quotes').insert([payload]);
      if (error) triggerToast('Error adding quote');
      else triggerToast('Quote added!');
    }
    
    setQuoteForm({ id: null, text: '', author: 'Sohel Khan', category_ids: [] });
    fetchQuotes();
  };

  const deleteQuote = async (id) => {
    if(!window.confirm('Delete this quote?')) return;
    setBusy(true);
    await supabase.from('app_quotes').delete().eq('id', id);
    triggerToast('Quote deleted');
    fetchQuotes();
  };

  const toggleCategoryForQuote = (catId) => {
    setQuoteForm(prev => {
      const exists = prev.category_ids.includes(catId);
      return {
        ...prev,
        category_ids: exists ? prev.category_ids.filter(id => id !== catId) : [...prev.category_ids, catId]
      };
    });
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    const id = (categoryForm.id || categoryForm.label)
      .trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!id || !categoryForm.label.trim()) return;
    setBusy(true);
    const payload = { ...categoryForm, id, label: categoryForm.label.trim() };
    const { error } = await supabase.from('app_categories').upsert(payload);
    setBusy(false);
    if (error) return triggerToast(`Category save failed: ${error.message}`);
    triggerToast('Category saved');
    setCategoryForm({ id: null, label: '', emoji: '✨', gradient_start: '#667EEA', gradient_end: '#764BA2' });
    fetchCategories();
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Existing quotes will remain, but will no longer show in this category.')) return;
    setBusy(true);
    const { error } = await supabase.from('app_categories').delete().eq('id', id);
    setBusy(false);
    if (error) return triggerToast(`Category delete failed: ${error.message}`);
    triggerToast('Category deleted');
    fetchCategories();
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className={`cta-btn ${activeTab === 'quotes' ? '' : 'cta-secondary'}`} onClick={() => setActiveTab('quotes')}>Manage Quotes</button>
        <button className={`cta-btn ${activeTab === 'categories' ? '' : 'cta-secondary'}`} onClick={() => setActiveTab('categories')}>Manage Categories</button>
      </div>

      {activeTab === 'quotes' && (
        <div>
          <form onSubmit={saveQuote} style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3>{quoteForm.id ? 'Edit Quote' : 'Add New Quote'}</h3>
            <textarea 
              value={quoteForm.text} 
              onChange={e => setQuoteForm({...quoteForm, text: e.target.value})} 
              placeholder="Quote text..."
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid var(--static-border)', minHeight: '80px' }}
            />
            <input 
              type="text" 
              value={quoteForm.author} 
              onChange={e => setQuoteForm({...quoteForm, author: e.target.value})} 
              placeholder="Author"
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid var(--static-border)' }}
            />
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Assign Categories:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map(c => (
                  <label key={c.id} style={{ background: quoteForm.category_ids.includes(c.id) ? 'var(--primary-color)' : 'rgba(0,0,0,0.1)', color: quoteForm.category_ids.includes(c.id) ? '#fff' : 'inherit', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ display: 'none' }} checked={quoteForm.category_ids.includes(c.id)} onChange={() => toggleCategoryForQuote(c.id)} />
                    {c.emoji || '✨'} {c.label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="cta-btn" disabled={busy}>{busy ? 'Saving...' : 'Save Quote'}</button>
              {quoteForm.id && <button type="button" className="cta-btn cta-secondary" onClick={() => setQuoteForm({ id: null, text: '', author: 'Sohel Khan', category_ids: [] })}>Cancel</button>}
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quotes.map(q => (
              <div key={q.id} style={{ border: '1px solid var(--static-border)', padding: '12px', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0' }}>"{q.text}"</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <small style={{ color: 'var(--text-secondary)' }}>- {q.author} | Cats: {q.category_ids.join(', ')}</small>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setQuoteForm(q)} style={{ background: 'none', border: 'none', color: '#667EEA', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => deleteQuote(q.id)} style={{ background: 'none', border: 'none', color: '#FC8181', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {quotes.length === 0 && !busy && <p>No quotes in CMS yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div>
          <form onSubmit={saveCategory} style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3>{categoryForm.id ? 'Edit Category' : 'Add Category'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '10px', marginBottom: '10px' }}>
              <input value={categoryForm.label} onChange={e => setCategoryForm({ ...categoryForm, label: e.target.value })} placeholder="Category name" required />
              <input value={categoryForm.emoji} onChange={e => setCategoryForm({ ...categoryForm, emoji: e.target.value })} placeholder="✨" aria-label="Category emoji" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <input type="color" value={categoryForm.gradient_start} onChange={e => setCategoryForm({ ...categoryForm, gradient_start: e.target.value })} aria-label="First category colour" />
              <input type="color" value={categoryForm.gradient_end} onChange={e => setCategoryForm({ ...categoryForm, gradient_end: e.target.value })} aria-label="Second category colour" />
            </div>
            <button type="submit" className="cta-btn" disabled={busy}>{categoryForm.id ? 'Update Category' : 'Save Category'}</button>
            {categoryForm.id && <button type="button" className="cta-btn cta-secondary" style={{ marginLeft: '10px' }} onClick={() => setCategoryForm({ id: null, label: '', emoji: '✨', gradient_start: '#667EEA', gradient_end: '#764BA2' })}>Cancel</button>}
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categories.map(category => (
              <div key={category.id} style={{ border: '1px solid var(--static-border)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                <span>{category.emoji || '✨'} <strong>{category.label}</strong> <small>({category.id})</small></span>
                <span style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setCategoryForm(category)} style={{ background: 'none', border: 'none', color: '#667EEA', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteCategory(category.id)} style={{ background: 'none', border: 'none', color: '#FC8181', cursor: 'pointer' }}>Delete</button>
                </span>
              </div>
            ))}
            {categories.length === 0 && !busy && <p>Create your first category above.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
