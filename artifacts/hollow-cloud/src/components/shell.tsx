import { Bell, ChevronDown, Cloud, Menu, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

const navItems = [
  { href: '/', label: 'Overview', glyph: '01' },
  { href: '/bots', label: 'Bots', glyph: '02' },
  { href: '/plans', label: 'Plans', glyph: '03' },
  { href: '/settings', label: 'Settings', glyph: '04' },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_0_5px_hsl(var(--sidebar-primary)/.1)]">
              <Cloud size={20} strokeWidth={2.5} />
            </span>
            <span className="font-extrabold tracking-[-0.04em] text-[17px]">Hollow Cloud</span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} className="text-sidebar-foreground/60 md:hidden" data-testid="button-close-menu">
            <X size={19} />
          </button>
        </div>
        <div className="flex-1 px-3 py-7">
          <p className="px-3 pb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">Control room</p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`link-nav-${item.label.toLowerCase()}`}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}
                >
                  <span className={`font-mono text-[10px] ${active ? 'text-sidebar-primary' : 'text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60'}`}>{item.glyph}</span>
                  {item.label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-2xl bg-sidebar-accent/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/50">Current plan</span>
              <span className="rounded-full bg-sidebar-primary/15 px-2 py-1 font-mono text-[10px] font-medium text-sidebar-primary">FREE</span>
            </div>
            <p className="text-sm font-bold text-sidebar-foreground">Builder workspace</p>
            <p className="mt-1 text-xs leading-5 text-sidebar-foreground/50">2 of 3 bot slots in use</p>
            <Link href="/plans" data-testid="link-upgrade-sidebar" className="mt-4 flex items-center justify-between text-xs font-bold text-sidebar-primary hover:text-sidebar-primary/80">
              Compare plans <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--accent))] font-bold text-xs text-accent-foreground">AM</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-sidebar-foreground">Alex Morgan</p>
              <p className="truncate text-[11px] text-sidebar-foreground/45">alex@hollow.dev</p>
            </div>
            <button type="button" disabled data-testid="button-account-menu" className="cursor-not-allowed text-sidebar-foreground/30"><ChevronDown size={15} /></button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-foreground/20 md:hidden" data-testid="button-close-overlay" />}
      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-xl md:px-10">
          <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground md:hidden" data-testid="button-open-menu"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> All systems operational
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={() => window.alert('No new notifications.')} className="relative rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" data-testid="button-notifications">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />
            </button>
            <Link href="/settings" data-testid="link-header-settings" className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Settings2 size={18} /></Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}