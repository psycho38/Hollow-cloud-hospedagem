import { useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Check, ChevronRight, CircleHelp, Cloud, Cpu, ExternalLink, Github, HardDrive, MoreHorizontal, Pause, Play, Plus, Search, Settings, ShieldCheck, Trash2, Upload, Wifi, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { getGetActivityQueryKey, getGetBotsQueryKey, getGetDashboardQueryKey, getHealthCheckQueryKey, useCreateBot, useCreateProCheckout, useDeleteBot, useGetActivity, useGetBots, useGetDashboard, useHealthCheck, useToggleBot, useUpdateBot } from '@workspace/api-client-react';
import type { Bot } from '@workspace/api-client-react';

function formatWhen(value?: string | null) {
  if (!value) return 'Not deployed yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const delta = Date.now() - date.getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="text-3xl font-extrabold tracking-[-0.055em] text-foreground md:text-[40px]">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
    {action}
  </div>;
}

function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false, testId }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'quiet' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; testId: string }) {
  const styles = variant === 'primary' ? 'bg-primary text-primary-foreground shadow-[0_7px_18px_hsl(var(--primary)/.18)] hover:-translate-y-0.5' : variant === 'danger' ? 'border border-destructive/25 bg-destructive/8 text-destructive hover:bg-destructive/12' : 'border border-border bg-card text-foreground hover:bg-muted';
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}>{children}</button>;
}

function StatusPill({ status }: { status: string }) {
  const online = status === 'online';
  const deploying = status === 'deploying';
  return <span data-testid={`status-bot-${status}`} className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] ${online ? 'bg-primary/10 text-primary' : deploying ? 'bg-accent/20 text-[hsl(30_80%_35%)]' : 'bg-muted text-muted-foreground'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-primary' : deploying ? 'animate-pulse bg-accent' : 'bg-muted-foreground/50'}`} /> {status}
  </span>;
}

function MetricCard({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: typeof Cloud; accent?: boolean }) {
  return <div className={`hc-panel rounded-2xl p-5 ${accent ? 'border-primary/30 bg-primary/[.045]' : ''}`}>
    <div className="mb-7 flex items-start justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.17em] text-muted-foreground">{label}</p><span className={`rounded-lg p-2 ${accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Icon size={16} /></span></div>
    <p className="text-3xl font-extrabold tracking-[-0.06em]">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </div>;
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Cloud size={22} /></span><h3 className="font-bold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/[.03] px-6 text-center"><AlertTriangle className="mb-4 text-destructive" size={23} /><h3 className="font-bold">The control room is quiet</h3><p className="mt-2 text-sm text-muted-foreground">We couldn't reach your workspace. Try again in a moment.</p><Button variant="danger" onClick={retry} testId="button-retry">Retry connection</Button></div>;
}

function LoadingCards() {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="hc-panel h-[145px] animate-pulse rounded-2xl bg-muted/40" />)}</div>;
}

export function OverviewPage() {
  const dashboard = useGetDashboard();
  const activity = useGetActivity();
  const bots = useGetBots();
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const [, setLocation] = useLocation();
  const onlineBots = useMemo(() => (bots.data ?? []).filter((bot) => bot.status === 'online'), [bots.data]);
  if (dashboard.isLoading) return <><PageHeading eyebrow="Workspace / 01" title="Good to see you, Alex." detail="Your bots are looked after. Here’s the latest from the control room." /><LoadingCards /></>;
  if (dashboard.isError) return <ErrorState retry={() => dashboard.refetch()} />;
  const data = dashboard.data;
  if (!data) return null;
  return <div className="hc-in">
    <PageHeading eyebrow="Workspace / 01" title="Good to see you, Alex." detail="Your bots are looked after. Here’s the latest from the control room." action={<Button onClick={() => setLocation('/bots')} testId="button-go-bots"><Plus size={16} /> New bot</Button>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Running now" value={`${data.onlineBots} / ${data.totalBots}`} detail={`${data.maxBots - data.totalBots} slots available`} icon={Wifi} accent />
      <MetricCard label="Memory in use" value={`${data.memoryUsedMb} MB`} detail={`of ${data.memoryLimitMb} MB allowance`} icon={Cpu} />
      <MetricCard label="Monthly runtime" value={`${data.monthlyHours}h`} detail="resets in 12 days" icon={Activity} />
      <MetricCard label="Workspace uptime" value={`${data.uptimePercent}%`} detail={`${data.planName} plan`} icon={ShieldCheck} />
    </section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <section className="hc-panel rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.17em] text-muted-foreground">Live fleet</p><h2 className="mt-1 text-lg font-extrabold tracking-[-0.04em]">Your hosted bots</h2></div><Link href="/bots" data-testid="link-view-all-bots" className="text-xs font-bold text-primary hover:underline">View all <ArrowUpRight className="ml-1 inline" size={13} /></Link></div>
        {bots.isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div> : bots.isError ? <ErrorState retry={() => bots.refetch()} /> : onlineBots.length === 0 ? <EmptyState title="No bots online yet" detail="Bring your first bot into the cloud and let the control room do the watching." action={<Button onClick={() => setLocation('/bots')} testId="button-add-first-bot"><Plus size={16} /> Add a bot</Button>} /> : <div className="space-y-2">{onlineBots.slice(0, 4).map((bot) => <BotRow key={bot.id} bot={bot} />)}</div>}
      </section>
      <section className="hc-panel rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.17em] text-muted-foreground">Signal log</p><h2 className="mt-1 text-lg font-extrabold tracking-[-0.04em]">Recent activity</h2></div><span className={`mt-1 h-2 w-2 rounded-full ${health.data?.status === 'ok' ? 'bg-primary' : 'bg-accent'}`} /></div>
        {activity.isLoading ? <div className="space-y-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-11 animate-pulse rounded-lg bg-muted" />)}</div> : activity.isError ? <p className="text-sm text-muted-foreground">Activity is temporarily unavailable.</p> : activity.data?.length ? <div className="space-y-4">{activity.data.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3"><div className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.type === 'deploy' ? 'bg-primary/10 text-primary' : item.type === 'status' ? 'bg-accent/20 text-[hsl(30_80%_35%)]' : 'bg-muted text-muted-foreground'}`}>{item.type === 'deploy' ? <Upload size={13} /> : item.type === 'status' ? <Wifi size={13} /> : <Activity size={13} />}</div><div className="min-w-0"><p className="text-xs font-bold">{item.title}</p><p className="truncate text-[11px] text-muted-foreground">{item.detail}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{formatWhen(item.timestamp)}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">Activity will appear here as you build.</p>}
      </section>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-sidebar-foreground"><div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[22px] border-sidebar-primary/10" /><div className="relative"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">Builder note</p><h2 className="mt-3 max-w-sm text-xl font-extrabold leading-tight tracking-[-0.045em]">Ship the code. We’ll keep the lights on.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-sidebar-foreground/55">Hollow Cloud watches the boring parts, so your attention stays with the next release.</p><Link href="/plans" data-testid="link-dashboard-plans" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-sidebar-primary">See what Pro unlocks <ChevronRight size={14} /></Link></div></div>
      <div className="hc-panel flex items-center justify-between rounded-2xl p-6"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace health</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.045em]">{health.data?.status === 'ok' ? 'Everything is steady.' : 'Checking your systems.'}</h2><p className="mt-2 text-sm text-muted-foreground">Last checked just now from the Hollow Cloud edge.</p></div><div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary"><span className="absolute inset-2 rounded-full border border-primary/15" /><ShieldCheck size={24} /></div></div>
    </div>
  </div>;
}

function BotRow({ bot }: { bot: Bot }) {
  return <Link href={`/bots/${bot.id}`} data-testid={`link-bot-${bot.id}`} className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/55"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary font-mono text-xs font-bold text-primary">{bot.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{bot.title}</p><p className="truncate text-xs text-muted-foreground">{bot.sourceLabel || bot.name}</p></div><div className="hidden text-right sm:block"><StatusPill status={bot.status} /><p className="mt-1 font-mono text-[9px] text-muted-foreground">{bot.uptime || '—'} uptime</p></div><ChevronRight className="text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" size={16} /></Link>;
}

function CreateBotDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const client = useQueryClient();
  const create = useCreateBot();
  const [form, setForm] = useState({ name: '', title: '', description: '', source: 'github', sourceLabel: '', memoryMb: '256' });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({ data: { ...form, memoryMb: Number(form.memoryMb), source: form.source as 'github' | 'zip' } }, { onSuccess: (bot) => { client.invalidateQueries({ queryKey: getGetBotsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetActivityQueryKey() }); onCreated(bot.id); } });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-5 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl md:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">New deployment</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">Add a bot</h2><p className="mt-1 text-sm text-muted-foreground">A few details, then we’ll take it from here.</p></div><button type="button" onClick={onClose} data-testid="button-close-create"><X size={19} className="text-muted-foreground" /></button></div>
    <form onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-2 block text-xs font-bold">Bot name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="orbit-helper" data-testid="input-bot-name" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
      <label className="block"><span className="mb-2 block text-xs font-bold">Display title</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Orbit Helper" data-testid="input-bot-title" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
      <label className="block"><span className="mb-2 block text-xs font-bold">What does it do?</span><textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="A small bot that keeps our community in orbit." data-testid="input-bot-description" rows={2} className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr]"><label className="block"><span className="mb-2 block text-xs font-bold">Source</span><select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} data-testid="select-bot-source" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary"><option value="github">GitHub repository</option><option value="zip">Upload a ZIP</option></select></label><label className="block"><span className="mb-2 block text-xs font-bold">Memory</span><select value={form.memoryMb} onChange={(event) => setForm({ ...form, memoryMb: event.target.value })} data-testid="select-bot-memory" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary"><option value="128">128 MB</option><option value="256">256 MB</option><option value="512">512 MB</option></select></label></div>
      <label className="block"><span className="mb-2 block text-xs font-bold">{form.source === 'github' ? 'Repository' : 'Archive label'}</span><input required value={form.sourceLabel} onChange={(event) => setForm({ ...form, sourceLabel: event.target.value })} placeholder={form.source === 'github' ? 'alex/orbit-helper' : 'orbit-helper-v1.zip'} data-testid="input-bot-source" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
      {create.isError && <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">Could not create this bot. Check the details and try again.</p>}
      <div className="flex justify-end gap-3 pt-2"><Button variant="quiet" onClick={onClose} testId="button-cancel-create">Cancel</Button><Button type="submit" disabled={create.isPending} testId="button-submit-create">{create.isPending ? 'Creating…' : 'Create bot'} {!create.isPending && <ArrowUpRight size={15} />}</Button></div>
    </form>
  </div></div>;
}

export function BotsPage() {
  const bots = useGetBots();
  const client = useQueryClient();
  const del = useDeleteBot();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const filtered = useMemo(() => (bots.data ?? []).filter((bot) => `${bot.title} ${bot.name} ${bot.description}`.toLowerCase().includes(search.toLowerCase())), [bots.data, search]);
  const deleteBot = (id: string) => { if (window.confirm('Delete this bot and its deployment history?')) del.mutate({ id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetBotsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetActivityQueryKey() }); } }); };
  return <div className="hc-in"><PageHeading eyebrow="Fleet / 02" title="Your bots" detail="Everything you host, in one quiet place." action={<Button onClick={() => setCreateOpen(true)} testId="button-open-create"><Plus size={16} /> Add a bot</Button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3.5 top-3 text-muted-foreground" size={17} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or description…" data-testid="input-search-bots" className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> {filtered.length} bot{filtered.length === 1 ? '' : 's'} in fleet</div></div>
    {bots.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="hc-panel h-56 animate-pulse rounded-2xl bg-muted/40" />)}</div> : bots.isError ? <ErrorState retry={() => bots.refetch()} /> : filtered.length === 0 ? <EmptyState title={search ? 'No bots match that search' : 'Your fleet is still empty'} detail={search ? 'Try a different name, source, or description.' : 'Create a bot and let Hollow Cloud keep it online for you.'} action={!search && <Button onClick={() => setCreateOpen(true)} testId="button-empty-create"><Plus size={16} /> Add your first bot</Button>} /> : <div className="grid gap-4 md:grid-cols-2">{filtered.map((bot) => <BotCard key={bot.id} bot={bot} onDelete={deleteBot} onOpen={() => setLocation(`/bots/${bot.id}`)} />)}</div>}
    {createOpen && <CreateBotDialog onClose={() => setCreateOpen(false)} onCreated={(id) => setLocation(`/bots/${id}`)} />}
  </div>;
}

function BotCard({ bot, onDelete, onOpen }: { bot: Bot; onDelete: (id: string) => void; onOpen: () => void }) {
  const toggle = useToggleBot();
  const client = useQueryClient();
  const handleToggle = () => toggle.mutate({ id: bot.id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetBotsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetActivityQueryKey() }); } });
  return <div className="hc-panel group rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5"><div className="flex items-start justify-between"><button type="button" onClick={onOpen} data-testid={`button-open-bot-${bot.id}`} className="flex items-center gap-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary font-mono text-xs font-bold text-primary">{bot.name.slice(0, 2).toUpperCase()}</span><span><span className="block text-base font-extrabold tracking-[-0.03em]">{bot.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{bot.name}</span></span></button><button type="button" onClick={() => onDelete(bot.id)} data-testid={`button-delete-bot-${bot.id}`} className="rounded-lg p-2 text-muted-foreground/50 transition-colors hover:bg-destructive/8 hover:text-destructive"><Trash2 size={16} /></button></div><p className="mt-5 min-h-[40px] text-sm leading-5 text-muted-foreground">{bot.description}</p><div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4"><div><StatusPill status={bot.status} /><p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><HardDrive size={11} /> {bot.memoryMb} MB · {formatWhen(bot.updatedAt)}</p></div><Button variant="quiet" onClick={handleToggle} disabled={toggle.isPending || bot.status === 'deploying'} testId={`button-toggle-bot-${bot.id}`}>{bot.status === 'online' ? <><Pause size={14} /> Stop</> : <><Play size={14} /> Start</>}</Button></div>{toggle.isError && <p className="mt-3 text-xs text-destructive">Action failed. Try again.</p>}</div>;
}

export function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bots = useGetBots();
  const client = useQueryClient();
  const update = useUpdateBot();
  const toggle = useToggleBot();
  const del = useDeleteBot();
  const [, setLocation] = useLocation();
  const bot = bots.data?.find((item) => item.id === id);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', title: '', description: '', memoryMb: 256 });
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (bot && !initialized) {
      setForm({ name: bot.name, title: bot.title, description: bot.description, memoryMb: bot.memoryMb });
      setInitialized(true);
    }
  }, [bot, initialized]);
  if (bots.isLoading) return <LoadingCards />;
  if (bots.isError) return <ErrorState retry={() => bots.refetch()} />;
  if (!bot) return <EmptyState title="Bot not found" detail="This bot may have been removed or the link is out of date." action={<Link href="/bots" data-testid="link-back-bots" className="text-sm font-bold text-primary">Back to bots</Link>} />;
  const save = (event: React.FormEvent) => { event.preventDefault(); update.mutate({ id: bot.id, data: { ...form } }, { onSuccess: () => { setSaved(true); client.invalidateQueries({ queryKey: getGetBotsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetActivityQueryKey() }); setTimeout(() => setSaved(false), 2200); } }); };
  const handleToggle = () => toggle.mutate({ id: bot.id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetBotsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); client.invalidateQueries({ queryKey: getGetActivityQueryKey() }); } });
  const handleDelete = () => { if (window.confirm(`Delete ${bot.title}?`)) del.mutate({ id: bot.id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetBotsQueryKey() }); client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation('/bots'); } }); };
  return <div className="hc-in"><Link href="/bots" data-testid="link-detail-back" className="mb-7 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={14} /> All bots</Link><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary font-mono font-bold text-primary">{bot.name.slice(0, 2).toUpperCase()}</span><div><div className="mb-2 flex items-center gap-3"><h1 className="text-3xl font-extrabold tracking-[-0.055em]">{bot.title}</h1><StatusPill status={bot.status} /></div><p className="text-sm text-muted-foreground">{bot.sourceLabel || bot.name} · updated {formatWhen(bot.updatedAt)}</p></div></div><Button onClick={handleToggle} disabled={toggle.isPending || bot.status === 'deploying'} testId="button-detail-toggle">{bot.status === 'online' ? <><Pause size={16} /> Take offline</> : <><Play size={16} /> Bring online</>}</Button></div>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><MetricCard label="Uptime" value={bot.uptime || '—'} detail="rolling 30 days" icon={ShieldCheck} accent /><MetricCard label="Memory" value={`${bot.memoryMb} MB`} detail="allocated to process" icon={Cpu} /><MetricCard label="Last deployed" value={formatWhen(bot.lastDeployedAt)} detail="source is in sync" icon={Upload} /></div>
    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><form onSubmit={save} className="hc-panel rounded-2xl p-5 md:p-7"><div className="mb-6 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Bot settings</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.045em]">Metadata</h2></div>{saved && <span className="flex items-center gap-1.5 text-xs font-bold text-primary"><Check size={15} /> Saved</span>}</div><div className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold">Bot name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} data-testid="input-detail-name" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold">Display title</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} data-testid="input-detail-title" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold">Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} data-testid="input-detail-description" className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold">Memory allocation</span><select value={form.memoryMb} onChange={(event) => setForm({ ...form, memoryMb: Number(event.target.value) })} data-testid="select-detail-memory" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"><option value={128}>128 MB</option><option value={256}>256 MB</option><option value={512}>512 MB</option></select></label></div><div className="mt-7 flex items-center justify-between gap-3"><Button variant="danger" onClick={handleDelete} disabled={del.isPending} testId="button-delete-detail"><Trash2 size={14} /> Delete bot</Button><Button type="submit" disabled={update.isPending} testId="button-save-detail">{update.isPending ? 'Saving…' : 'Save changes'}</Button></div></form><div className="space-y-5"><section className="hc-panel rounded-2xl p-5 md:p-7"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Source</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.045em]">{bot.source === 'github' ? 'GitHub repository' : 'Uploaded archive'}</h2><div className="mt-5 flex items-center gap-3 rounded-xl bg-muted/60 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-card text-foreground">{bot.source === 'github' ? <Github size={17} /> : <Upload size={17} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{bot.sourceLabel || 'Source not labeled'}</p><p className="text-xs text-muted-foreground">{bot.source === 'github' ? 'Connected repository' : 'Deployment archive'}</p></div><ExternalLink size={14} className="text-muted-foreground" /></div><button type="button" disabled data-testid="button-source-manage" className="mt-4 cursor-not-allowed text-xs font-bold text-muted-foreground">Manage source <ArrowUpRight className="ml-1 inline" size={13} /></button></section><section className="rounded-2xl border border-accent/30 bg-accent/[.08] p-5 md:p-7"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 shrink-0 text-[hsl(30_80%_35%)]" size={18} /><div><h2 className="text-sm font-extrabold">A calm deployment loop</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">When you’re ready, update your source and bring the bot online. Hollow Cloud will handle the restart.</p></div></div></section></div></div>
  </div>;
}

export function PlansPage() {
  const [selected, setSelected] = useState<'free' | 'pro'>('free');
  const checkout = useCreateProCheckout();
  const [email, setEmail] = useState('');
  const checkoutState = new URLSearchParams(window.location.search).get('checkout');
  const startCheckout = (event: React.FormEvent) => {
    event.preventDefault();
    checkout.mutate({ data: { email } }, {
      onSuccess: (session) => {
        window.location.assign(session.url);
      },
    });
  };
  return <div className="hc-in"><PageHeading eyebrow="Workspace / 03" title="A little more headroom." detail="Start light. Upgrade when your bots start asking for more room." /><div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]"><section className="rounded-2xl bg-sidebar p-7 text-sidebar-foreground md:p-9"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Cloud size={20} /></span><span className="font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">Hollow Cloud</span></div><div className="mt-20"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-primary">For builders who ship</p><h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-.06em] md:text-4xl">More room to make weird, useful things.</h2><p className="mt-4 max-w-md text-sm leading-6 text-sidebar-foreground/55">Pro gives your bots more memory, more slots, and fewer reasons to check the dashboard.</p></div><div className="mt-10 border-t border-sidebar-border pt-5 font-mono text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">No surprise overages · Cancel when you want</div></section><div className="space-y-4"><PlanCard name="Free" price="R$ 0" detail="For experiments and small communities" selected={selected === 'free'} onSelect={() => setSelected('free')} features={['3 hosted bots', '524 MB total memory', '500 monthly runtime hours', 'Community support']} /><PlanCard name="Pro" price="R$ 12" detail="For bots that people rely on" selected={selected === 'pro'} onSelect={() => setSelected('pro')} features={['12 hosted bots', '1 GB per bot', 'Unlimited runtime hours', 'Priority deployment queue']} popular /></div></div>{selected === 'pro' && <form onSubmit={startCheckout} className="mt-5 rounded-2xl border border-primary/25 bg-primary/[.035] p-5 md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-end"><label className="block flex-1"><span className="mb-2 block text-xs font-bold">E-mail do comprador</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" data-testid="input-checkout-email" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/50 focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><Button type="submit" disabled={checkout.isPending} testId="button-start-checkout">{checkout.isPending ? 'Abrindo checkout…' : 'Continuar para pagamento'} <ArrowUpRight size={15} /></Button></div><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} className="text-primary" /> O Stripe solicitará CPF e os dados de pagamento diretamente no checkout seguro.</p>{checkout.isError && <p className="mt-3 text-xs text-destructive">Não foi possível abrir o pagamento agora. Tente novamente.</p>}{checkoutState === 'success' && <p className="mt-3 text-xs font-bold text-primary">Pagamento recebido. Estamos confirmando sua assinatura.</p>}{checkoutState === 'cancelled' && <p className="mt-3 text-xs text-muted-foreground">O checkout foi cancelado. Você pode tentar novamente quando quiser.</p>}</form>}<div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={14} className="text-primary" /> Pagamentos seguros via Stripe <span className="mx-1 text-border">·</span> CPF preenchido somente no checkout</div></div>;
}

function PlanCard({ name, price, detail, features, selected, onSelect, popular }: { name: string; price: string; detail: string; features: string[]; selected: boolean; onSelect: () => void; popular?: boolean }) {
  return <button type="button" onClick={onSelect} data-testid={`button-select-plan-${name.toLowerCase()}`} className={`relative w-full rounded-2xl border p-6 text-left transition-all duration-200 md:p-7 ${selected ? 'border-primary bg-primary/[.035] shadow-[0_10px_30px_hsl(var(--primary)/.08)]' : 'border-border bg-card hover:border-primary/40'}`}>{popular && <span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[.13em] text-accent-foreground">Most builders choose this</span>}<div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="text-xl font-extrabold tracking-[-.045em]">{name}</h2>{selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={12} /></span>}</div><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div><div className="text-right"><span className="text-3xl font-extrabold tracking-[-.06em]">{price}</span><span className="text-xs text-muted-foreground"> / month</span></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{features.map((feature) => <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="shrink-0 text-primary" size={15} /> {feature}</div>)}</div><div className={`mt-6 flex items-center justify-center rounded-xl py-2.5 text-sm font-bold ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{name === 'Free' ? 'Current plan' : selected ? 'Upgrade to Pro' : 'Choose Pro'} {name === 'Pro' && <ArrowUpRight size={15} className="ml-2" />}</div></button>;
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [provider, setProvider] = useState('github');
  const save = (event: React.FormEvent) => { event.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2200); };
  return <div className="hc-in"><PageHeading eyebrow="Workspace / 04" title="Settings" detail="A few quiet controls for your Hollow Cloud workspace." /><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><form onSubmit={save} className="hc-panel rounded-2xl p-5 md:p-7"><div className="mb-7 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Your account</p><h2 className="mt-2 text-xl font-extrabold tracking-[-.045em]">Profile details</h2></div>{saved && <span className="flex items-center gap-1.5 text-xs font-bold text-primary"><Check size={15} /> Saved</span>}</div><div className="space-y-5"><div className="flex items-center gap-4 rounded-xl bg-muted/55 p-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">AM</div><div><p className="font-bold">Alex Morgan</p><p className="text-xs text-muted-foreground">alex@hollow.dev</p></div><button type="button" data-testid="button-change-avatar" className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-card"><MoreHorizontal size={17} /></button></div><label className="block"><span className="mb-2 block text-xs font-bold">Display name</span><input defaultValue="Alex Morgan" data-testid="input-display-name" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold">Email address</span><input defaultValue="alex@hollow.dev" type="email" data-testid="input-email" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="flex items-center justify-between rounded-xl border border-border p-4"><span><span className="block text-sm font-bold">Deployment notifications</span><span className="mt-1 block text-xs text-muted-foreground">Get a note when a bot changes state.</span></span><button type="button" onClick={() => setNotifications(!notifications)} data-testid="button-toggle-notifications" className={`relative h-6 w-11 rounded-full transition-colors ${notifications ? 'bg-primary' : 'bg-muted'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-card transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} /></button></label></div><div className="mt-7 flex justify-end"><Button type="submit" testId="button-save-settings">Save changes</Button></div></form><div className="space-y-5"><section className="hc-panel rounded-2xl p-5 md:p-7"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-primary">Connected providers</p><h2 className="mt-2 text-xl font-extrabold tracking-[-.045em]">Login & source access</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Providers are used to sign you in and reach private repositories when you deploy.</p><div className="mt-6 space-y-3"><ProviderRow icon={<Github size={17} />} title="GitHub" detail="alexmorgan" connected={provider === 'github'} onClick={() => setProvider(provider === 'github' ? '' : 'github')} testId="button-connect-github" /><ProviderRow icon={<Cloud size={17} />} title="Discord" detail="alexmorgan#0412" connected={provider === 'discord'} onClick={() => setProvider(provider === 'discord' ? '' : 'discord')} testId="button-connect-discord" /></div></section><section className="rounded-2xl border border-destructive/20 bg-destructive/[.03] p-5 md:p-7"><div className="flex items-start gap-3"><Settings className="mt-0.5 text-destructive" size={18} /><div><h2 className="text-sm font-extrabold">Danger zone</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Remove your workspace and all hosted bots. This cannot be undone.</p><button type="button" data-testid="button-delete-workspace" className="mt-4 text-xs font-bold text-destructive hover:underline">Delete workspace</button></div></div></section></div></div></div>;
}

function ProviderRow({ icon, title, detail, connected, onClick, testId }: { icon: ReactNode; title: string; detail: string; connected: boolean; onClick: () => void; testId: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-border p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">{icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{title}</p><p className="text-xs text-muted-foreground">{connected ? detail : 'Not connected'}</p></div><button type="button" onClick={onClick} data-testid={testId} className={`rounded-lg px-3 py-2 text-xs font-bold ${connected ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground hover:bg-secondary'}`}>{connected ? 'Connected' : 'Connect'}</button></div>;
}