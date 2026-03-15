'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { StaggerContainer, FadeUpItem } from '@/components/motion';

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
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      >
        <div>
          <h1 className="font-display text-3xl text-neutral-900">Clients</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage your insurance clients</p>
        </div>
        <motion.button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {showForm ? 'Cancel' : (
            <>
              <Plus className="h-4 w-4" />
              New Client
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="card p-6 mb-6 relative"
          >
            {saving && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
                <p className="mt-3 text-sm font-medium text-neutral-600">Creating client...</p>
              </div>
            )}

            <h2 className="text-base font-semibold text-neutral-900">New Client</h2>
            <p className="mt-1 text-sm text-neutral-500 mb-4">Add a new insurance client to your workspace</p>
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
                <motion.button
                  className="btn-primary w-full"
                  type="submit"
                  disabled={saving || !formData.name}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {saving ? 'Creating...' : 'Create Client'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client List */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
      >
        <div className="divide-y divide-neutral-100">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-10 w-10 text-neutral-300 float" />
              <h3 className="mt-3 text-sm font-medium text-neutral-900">No clients yet</h3>
              <p className="mt-1 text-sm text-neutral-500">Create your first client to get started.</p>
            </div>
          ) : (
            <StaggerContainer delay={0.15}>
              {clients.map((client) => (
                <FadeUpItem key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{client.name}</p>
                        <p className="text-xs text-neutral-500">{client.industry || 'No industry'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium tabular text-neutral-700">{client.policy_count} policies</p>
                        <p className="text-xs text-neutral-500">Added {formatDate(client.created_at)}</p>
                      </div>
                      <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </FadeUpItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </motion.div>
    </div>
  );
}
