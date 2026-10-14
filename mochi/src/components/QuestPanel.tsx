/** A quest's details: world, date, waiting on, priority, notes, and where it lives. */
import { useEffect, useState } from 'react';
import { integrationLabel } from '../integrations';
import { dueLabel } from '../lib/dates';
import { dateForPreset, presetForDate, type DuePreset } from '../lib/due';
import { useStore } from '../store/store';
import { IconCalendar, IconExternal, IconPlay, IconTrash, IconX } from './Icons';
import { MochiMark, WorldCreature, worldStyle } from './ui';

const WHEN: { key: DuePreset; label: string }[] = [
  { key: 'today', label: 'Today' }, { key: 'tomorrow', label: 'Tomorrow' }, { key: 'weekend', label: 'Weekend' }, { key: 'nextweek', label: 'Next week' }, { key: 'someday', label: 'Someday' },
];

export function QuestPanel() {
  const { state, ui, actions, worldOf } = useStore();
  const q = state.quests.find((x) => x.id === ui.openQuestId) ?? null;
  const [title, setTitle] = useState('');
  const [wait, setWait] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTitle(q?.title ?? '');
    setWait(q?.waitingOn ?? '');
    setConfirm(false);
    setSending(false);
  }, [q?.id, q?.title, q?.waitingOn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!q) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && actions.openQuest(null);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [q, actions]);

  if (!q) return null;
  const w = worldOf(q.worldId);
  const tool = w.link ? integrationLabel(w.link.integrationId) : null;
  const connected = !!w.link && !!state.integrations[w.link.integrationId]?.connected;

  return (
    <div className="panel-layer">
      <div className="panel-backdrop" onClick={() => actions.openQuest(null)} />
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="qp-title" style={worldStyle(w)}>
        <div className="panel-top">
          <button type="button" className="panel-world" onClick={() => actions.navigate({ name: 'world', id: w.id })}>
            <WorldCreature world={w} size={30} showSpeech /> <b>{w.name}</b>
          </button>
          <button type="button" className="icon-btn" onClick={() => actions.openQuest(null)} aria-label="Close"><IconX /></button>
        </div>

        <textarea id="qp-title" className="panel-title" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Quest"
          onBlur={() => { const t = title.trim(); if (t && t !== q.title) actions.updateQuest(q.id, { title: t }); else setTitle(q.title); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }} />

        <div className={`source-card${q.source === 'external' ? ' ext' : ''}`}>
          {q.source === 'external' && q.external ? (
            <>
              <span className="source-ico"><IconExternal size={14} /></span>
              <span><b>From {integrationLabel(q.external.integrationId)} · {q.external.key}</b><small>Completing it here marks it done there too.</small></span>
            </>
          ) : (
            <>
              <span className="source-ico"><MochiMark size={14} /></span>
              <span><b>Private quest</b><small>Made in Mochi. Only you can see it.{tool ? ` It isn’t in ${tool}.` : ''}</small></span>
              {tool && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={!connected || sending} onClick={async () => { setSending(true); await actions.sendExternal(q.id); setSending(false); }}>
                  {sending ? 'Sending…' : `Send to ${tool}`}
                </button>
              )}
            </>
          )}
        </div>

        <dl className="props">
          <dt>World</dt>
          <dd className="world-pick">
            {state.worlds.map((x) => (
              <button key={x.id} type="button" className={x.id === w.id ? 'on' : ''} style={worldStyle(x)} disabled={!!q.external && x.id !== w.id} onClick={() => actions.updateQuest(q.id, { worldId: x.id })} title={x.name} aria-pressed={x.id === w.id}>
                <WorldCreature world={x} size={22} mini /><span>{x.name}</span>
              </button>
            ))}
          </dd>
          <dt>When</dt>
          <dd className="chips">
            {WHEN.map((o) => (
              <button key={o.key} type="button" className={`chip chip-sm${presetForDate(q.dueDate) === o.key ? ' on' : ''}`} onClick={() => actions.updateQuest(q.id, { dueDate: dateForPreset(o.key, null) })}>{o.label}</button>
            ))}
            <label className={`chip chip-sm chip-date${presetForDate(q.dueDate) === 'custom' ? ' on' : ''}`}>
              <IconCalendar size={12} />{presetForDate(q.dueDate) === 'custom' && <span>{dueLabel(q.dueDate)}</span>}
              <span className="sr-only">Pick a date</span>
              <input type="date" value={q.dueDate ?? ''} onChange={(e) => e.target.value && actions.updateQuest(q.id, { dueDate: e.target.value })} />
            </label>
          </dd>
          <dt>Waiting on</dt>
          <dd>
            <input className="field" value={wait} placeholder="Nobody. It’s on you." onChange={(e) => setWait(e.target.value)} onBlur={() => actions.updateQuest(q.id, { waitingOn: wait.trim() || null })} aria-label="Waiting on" />
          </dd>
          <dt>Priority</dt>
          <dd className="seg">
            {(['normal', 'high'] as const).map((p) => <button key={p} type="button" className={q.priority === p ? 'on' : ''} aria-pressed={q.priority === p} onClick={() => actions.updateQuest(q.id, { priority: p })}>{p === 'high' ? 'High' : 'Normal'}</button>)}
          </dd>
        </dl>

        <label className="notes">
          <span className="eyebrow">Notes</span>
          <textarea key={q.id} rows={4} defaultValue={q.notes ?? ''} placeholder="Only for you." onBlur={(e) => actions.updateQuest(q.id, { notes: e.target.value })} />
        </label>

        <div className="panel-foot">
          {!q.done ? (
            <button type="button" className="btn btn-primary" onClick={() => actions.startFocus([q.id])}><IconPlay size={13} /> Enter focus</button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => actions.toggleDone(q.id)}>Reopen</button>
          )}
          {confirm ? (
            <span className="confirm">
              {q.external ? `Remove from Mochi? It stays in ${integrationLabel(q.external.integrationId)}.` : 'Delete this quest?'}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => actions.deleteQuest(q.id)}>{q.external ? 'Remove' : 'Delete'}</button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirm(true)}><IconTrash size={13} /> {q.external ? 'Remove' : 'Delete'}</button>
          )}
        </div>
      </aside>
    </div>
  );
}
