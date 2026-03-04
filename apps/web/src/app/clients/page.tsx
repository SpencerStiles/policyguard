'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, CheckCircle } from 'lucide-react';
import * as api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function ClientsPage() {
  const [clients, setClients] = useState<api.ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', industry: '', description: '', contact_email: '' });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api
      .listClients()
      .then(setClients)
      .catch((err) => {
        logger.error('Failed to load clients', { error: String(err) });
        setError('Failed to load clients. Is the API server running?');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createClient(formData);
      setFormData({ name: '', industry: '', description: '', contact_email: '' });
      setShowForm(false);
      setSuccessMessage('Client created successfully');
      load();
    } catch (err) {
      logger.error('Failed to create client', { error: String(err) });
      const message = String(err);
      if (message.includes('timed out') || message.includes('warming up')) {
        setError('The server may be warming up. Please wait a moment and try again.');
      } else {
        setError('Failed to create client. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your insurance clients</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : (
            <>
              <Plus className="h-4 w-4" />
              New Client
            </>
          )}
        </button>
      </div>

      {/* Success Toast */}
      {successMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="card p-6 mb-6 relative">
          {/* Loading Overlay */}
          {saving && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
              <p className="mt-3 text-sm font-medium text-gray-600">Creating client...</p>
            </div>
          )}

          <h2 className="text-lg font-semibold text-gray-900">New Client</h2>
          <p className="mt-1 text-sm text-gray-500 mb-4">Add a new insurance client to your workspace</p>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>
            <div>
              <label className="label">Industry</label>
              <select
                className="input"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              >
                <option value="">Select industry...</option>
                <option value="technology-saas">Technology / SaaS</option>
                <option value="professional-services">Professional Services</option>
                <option value="healthcare-provider">Healthcare</option>
                <option value="construction-general">Construction</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="retail-ecommerce">Retail / E-Commerce</option>
                <option value="financial-services">Financial Services</option>
                <option value="hospitality">Hospitality</option>
                <option value="nonprofit">Nonprofit</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the client's business..."
              />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input
                className="input"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            <div className="flex items-end">
              <button className="btn-primary w-full" type="submit" disabled={saving || !formData.name}>
                {saving ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client List */}
      <div className="card">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-sm font-medium text-gray-900">No clients yet</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first client to get started.</p>
            </div>
          ) : (
            clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.industry || 'No industry'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{client.policy_count} policies</p>
                    <p className="text-xs text-gray-500">Added {formatDate(client.created_at)}</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
