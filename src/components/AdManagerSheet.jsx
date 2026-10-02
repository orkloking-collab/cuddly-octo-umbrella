import React, { useEffect, useState } from 'react';
import { Megaphone, X, ImagePlus, Loader2, Info } from 'lucide-react';
import { useDialog } from '../utils/useDating';
import { datingStore } from '../utils/datingStore';
import { serverSync } from '../utils/serverSync';
import { preparePhoto } from '../utils/mediaApi';
import { AD_CPM_USD } from '../data/plans.js';

/**
 * Ad manager for first-party placements.
 *
 * Read the honesty note at the bottom before calling this "monetisation done":
 * counting, approval states and pricing are real; the money is not, because there
 * is no payment provider attached to this deploy. A campaign can be created and
 * reviewed, and impressions/clicks are counted on our own server — what nobody can
 * do yet is pay for it.
 */
export default function AdManagerSheet({ open, onClose }) {
  useDialog(open, onClose);
  const [form, setForm] = useState({ title: '', targetUrl: '', imageUrl: '', placement: 'banner', impressionsBudget: 5000 });
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => serverSync.myAds().then((out) => setCampaigns(out?.campaigns || []));

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    return () => setCampaigns([]);
  }, [open]);

  if (!open) return null;

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const estimate = (form.impressionsBudget / 1000) * AD_CPM_USD;

  async function pickImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('image');
    try {
      const out = await preparePhoto(file, { maxEdge: 640, quality: 0.8 });
      setForm((prev) => ({ ...prev, imageUrl: out.url }));
      setMessage(out.local ? 'Preview kept in this tab — an ad image has to live on the server, so start it before publishing.' : '');
    } catch (err) {
      setMessage(err?.message || 'That image could not be prepared.');
    } finally {
      setBusy('');
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy('save');
    setMessage('');
    const out = await serverSync.createAd({ ...form, impressionsBudget: Number(form.impressionsBudget) || 1000 });
    setBusy('');
    if (out?.error) {
      setMessage(out.error);
      return;
    }
    setMessage('Sent for review. Approved campaigns start appearing in the slot within a minute.');
    setForm({ title: '', targetUrl: '', imageUrl: '', placement: 'banner', impressionsBudget: 5000 });
    refresh();
  }

  return (
    <div className="fixed inset-0 z-[96] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Ad manager">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/12 bg-[#150c20] p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/15 text-rose-300"><Megaphone className="h-5 w-5" /></span>
            <div>
              <h2 className="text-lg font-bold text-white">Ad manager</h2>
              <p className="text-[11.5px] text-rose-100/60">First-party placements · ${(AD_CPM_USD).toFixed(2)} CPM</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-rose-100/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-2.5">
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-100/55">
            Headline (max 120 characters)
            <input required maxLength={120} value={form.title} onChange={set('title')} placeholder="Velvet Photo Studio — profile photos that get matches" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] font-normal text-white outline-none placeholder:text-rose-100/30 focus:border-rose-400/60" />
          </label>
          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-100/55">
            Where the click goes (http/https only)
            <input required value={form.targetUrl} onChange={set('targetUrl')} placeholder="https://yoursite.com/romancha" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] font-normal text-white outline-none placeholder:text-rose-100/30 focus:border-rose-400/60" />
          </label>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-100/55">
              Impressions
              <input type="number" min="100" max="2000000" step="100" value={form.impressionsBudget} onChange={set('impressionsBudget')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] font-normal text-white outline-none focus:border-rose-400/60" />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-100/55">
              Slot
              <select value={form.placement} onChange={set('placement')} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[13px] font-normal text-white outline-none">
                <option value="banner">Feed (728×90)</option>
                <option value="strip">Site strip</option>
                <option value="reels">Between reels</option>
              </select>
            </label>
            <div className="grid gap-1 text-[11px] font-semibold uppercase tracking-wider text-rose-100/55">
              Image
              <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[12px] font-normal text-rose-100/80 hover:border-white/25 ${busy === 'image' ? 'opacity-60' : ''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={pickImage} />
                {busy === 'image' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {form.imageUrl ? 'Image set' : 'Upload 640px'}
              </label>
            </div>
          </div>
          {form.imageUrl && <img src={form.imageUrl} alt="Your ad creative" className="max-h-40 w-full rounded-xl object-contain" />}
          <button disabled={Boolean(busy)} className="mt-1 w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-60">
            {busy === 'save' ? 'Sending for review…' : `Submit campaign · est. $${estimate.toFixed(2)}`}
          </button>
          {message && <p className="text-[11.5px] leading-snug text-amber-200">{message}</p>}
        </form>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-100/55">Your campaigns</p>
          {campaigns.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-rose-100/45">Nothing yet. {datingStore.getState().server?.mode === 'server' ? '' : 'This list needs the Romancha server running — in this tab there is no ad table to write to.'}</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {campaigns.map((c) => (
                <li key={c.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-white">{c.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase ${c.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : c.status === 'rejected' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-200'}`}>{c.status}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-100/55">
                    {c.impressions} impressions · {c.clicks} clicks
                    {c.impressions ? ` · ${(c.clicks / c.impressions * 100).toFixed(1)}% CTR` : ''} · billed so far ${c.estimatedCostUsd?.toFixed?.(2) || '0.00'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-4 flex gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-rose-100/55">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
          <span>
            Ads on Romancha are sold by us, placed by us and counted by us. No third-party ad network is loaded into this page:
            remote <code className="text-rose-200">document.write</code> tags on an 18+ app means malvertising and a policy fight with
            every app store. Invoices and payouts need a payment provider first, so nothing is charged and nobody is paid yet —
            approving a campaign here only makes it appear in the slot.
          </span>
        </p>
      </div>
    </div>
  );
}
