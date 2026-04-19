/**
 * providerMeta.js
 *
 * Purely UI/branding metadata for known providers and model IDs.
 * This file does NOT control which providers or models are available —
 * that is determined solely by the API (/api/active-providers + /api/plans).
 *
 * Usage:
 *   import { getProviderMeta, getModelMeta, inferProvider, buildDynamicCatalogue } from '../lib/providerMeta';
 */

import React from 'react';

// ── Provider branding (logos + colors) ───────────────────────────────────────
// Keyed by ProviderType enum value from the backend: openai | gemini | anthropic

export const PROVIDER_META = {
  openai: {
    name: 'OpenAI',
    accent: 'text-emerald-400',
    bg: 'bg-[#10a37f]/10',
    border: 'border-[#10a37f]/25',
    glow: 'shadow-[0_0_30px_rgba(16,163,127,0.12)]',
    logoColor: 'text-[#10a37f]',
    Logo: ({ className = 'w-8 h-8' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.843-3.369 2.019-1.168a.076.076 0 0 1 .071 0l4.83 2.786a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.4-.676zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
  },
  gemini: {
    name: 'Google Gemini',
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/25',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.12)]',
    logoColor: '',
    Logo: ({ className = 'w-8 h-8' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="gem-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285F4"/>
            <stop offset="50%" stopColor="#34A853"/>
            <stop offset="100%" stopColor="#FBBC05"/>
          </linearGradient>
        </defs>
        <path d="M12 2C12 2 6 8 6 12C6 16 12 22 12 22C12 22 18 16 18 12C18 8 12 2 12 2Z" fill="url(#gem-grad)" opacity="0.9"/>
        <path d="M2 12C2 12 8 6 12 6C16 6 22 12 22 12C22 12 16 18 12 18C8 18 2 12 2 12Z" fill="url(#gem-grad)" opacity="0.7"/>
      </svg>
    ),
  },
  anthropic: {
    name: 'Anthropic',
    accent: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/25',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.12)]',
    logoColor: 'text-orange-400',
    Logo: ({ className = 'w-8 h-8' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017L3.674 20H0L6.57 3.52zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"/>
      </svg>
    ),
  },
};

// Fallback for unknown providers
const DEFAULT_PROVIDER = {
  name: null, // will use raw provider id
  accent: 'text-violet-400',
  bg: 'bg-violet-500/10',
  border: 'border-violet-500/25',
  glow: '',
  logoColor: 'text-violet-400',
  Logo: ({ className = 'w-8 h-8' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 8v4l3 3"/>
    </svg>
  ),
};

// ── Model display hints ───────────────────────────────────────────────────────
// Keyed by model_id. Only controls appearance — never controls availability.

const MODEL_META = {
  'gpt-4o-mini':                { label: 'GPT-4o Mini',      emoji: '🚀', color: 'text-sky-400',     gradient: 'from-sky-600/20 to-sky-600/5',       border: 'border-sky-500/30',     ring: 'ring-sky-500/40',     badge: 'Most Popular', badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',         tagline: 'Smart & affordable — ideal for most use cases',           drainLabel: '3× base rate' },
  'gpt-4o':                     { label: 'GPT-4o',           emoji: '👑', color: 'text-rose-400',    gradient: 'from-rose-600/20 to-rose-600/5',       border: 'border-rose-500/30',    ring: 'ring-rose-500/40',    badge: 'Most Capable', badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',      tagline: 'Most capable OpenAI model for complex tasks',             drainLabel: '10× base rate' },
  'gemini-1.5-flash':           { label: 'Gemini 1.5 Flash', emoji: '⚡', color: 'text-emerald-400', gradient: 'from-emerald-600/20 to-emerald-600/5', border: 'border-emerald-500/30', ring: 'ring-emerald-500/40', badge: 'Best Value',   badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', tagline: 'Fastest & cheapest — great for quick tasks',           drainLabel: '1× base rate' },
  'gemini-1.5-pro':             { label: 'Gemini 1.5 Pro',   emoji: '🌐', color: 'text-teal-400',    gradient: 'from-teal-600/20 to-teal-600/5',       border: 'border-teal-500/30',    ring: 'ring-teal-500/40',    badge: null,           badgeColor: '',                                                     tagline: 'Balanced performance with 1M token context',              drainLabel: '5× base rate' },
  'claude-3-5-sonnet-20241022': { label: 'Claude Latest',    emoji: '🧠', color: 'text-orange-400',  gradient: 'from-orange-600/20 to-orange-600/5',   border: 'border-orange-500/30',  ring: 'ring-orange-500/40',  badge: 'Best for Code',badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20', tagline: 'Best for reasoning, writing & complex code',             drainLabel: '8× base rate' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Auto-format an unknown model ID into a readable label.
 * e.g. "llama-3-70b-instruct" -> "Llama 3 70b Instruct"
 */
export function formatModelId(modelId) {
  return modelId
    .replace(/-(\d{8})$/, '')          // strip date suffix e.g. -20241022
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Infer provider from model_id string pattern.
 * Falls back to 'unknown' for unrecognised models.
 */
export function inferProvider(modelId) {
  if (!modelId) return 'unknown';
  const id = modelId.toLowerCase();
  if (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3')) return 'openai';
  if (id.startsWith('gemini-') || id.startsWith('palm-') || id.startsWith('bison')) return 'gemini';
  if (id.startsWith('claude-')) return 'anthropic';
  return 'unknown';
}

/**
 * Get provider branding metadata for a provider ID.
 * Safe — returns a default if provider is unknown.
 */
export function getProviderMeta(providerId) {
  return PROVIDER_META[providerId] || { ...DEFAULT_PROVIDER, name: providerId };
}

/**
 * Get model display metadata for a model ID.
 * Safe — auto-generates label and default styling for unknown models.
 */
export function getModelMeta(modelId) {
  if (MODEL_META[modelId]) return MODEL_META[modelId];
  // Auto-generate for unknown model IDs
  return {
    label: formatModelId(modelId),
    emoji: '🤖',
    color: 'text-violet-400',
    gradient: 'from-violet-600/20 to-violet-600/5',
    border: 'border-violet-500/30',
    ring: 'ring-violet-500/40',
    badge: null,
    badgeColor: '',
    tagline: modelId,
    drainLabel: '',
  };
}

/**
 * Build the dynamic model catalogue from API data.
 *
 * @param {Array}  plans           - response from GET /api/plans
 * @param {Array}  activeProviders - response from GET /api/active-providers (list of provider IDs)
 * @returns {Array} deduplicated model objects ready for UI consumption
 */
export function buildDynamicCatalogue(plans, activeProviders) {
  // If plans have model_ids, use them (model-specific plans)
  const plansWithModel = plans.filter(p => p.model_id);
  if (plansWithModel.length > 0) {
    const seen = new Set();
    const models = [];
    for (const plan of plansWithModel) {
      const modelId = plan.model_id;
      if (seen.has(modelId)) continue;
      const provider = inferProvider(modelId);
      if (activeProviders.length > 0 && !activeProviders.includes(provider)) continue;
      seen.add(modelId);
      models.push({ id: modelId, providerKey: provider, ...getModelMeta(modelId) });
    }
    return models;
  }

  // Universal plans: show all known models for active providers
  const knownModels = Object.keys(MODEL_META);
  const seen = new Set();
  const models = [];
  for (const modelId of knownModels) {
    const provider = inferProvider(modelId);
    if (activeProviders.length > 0 && !activeProviders.includes(provider)) continue;
    if (seen.has(modelId)) continue;
    seen.add(modelId);
    models.push({ id: modelId, providerKey: provider, ...getModelMeta(modelId) });
  }
  return models;
}
