import { useState } from 'react';
import { ChevronDown, LogOut, MoreHorizontal, Search, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { iconMap } from '@/icons';
import { navItems } from '@/data';

interface SidebarProps {
  activeItem: string;
  onNavigate: (item: string) => void;
}

export function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-ink-700/80 bg-ink-900">
      <div className="flex h-[72px] items-center border-b border-ink-700/80 px-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/15">
            <ShieldCheck className="h-5 w-5 text-ink-950" strokeWidth={2.5} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-ink-900" />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-white">OptiShield <span className="text-cyan-400">AI</span></div>
            <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-ink-400">Risk Quantification</div>
          </div>
        </div>
      </div>

      <div className="relative px-3 pt-5">
        <button onClick={() => setWorkspaceOpen(!workspaceOpen)} className="flex w-full items-center gap-3 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-left transition-colors hover:border-ink-500">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15 text-[11px] font-bold text-blue-400">AC</div>
          <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-ink-100">Acme Corporation</div><div className="text-[10px] text-ink-400">Enterprise workspace</div></div>
          <ChevronDown className={`h-3.5 w-3.5 text-ink-400 transition-transform ${workspaceOpen ? 'rotate-180' : ''}`} />
        </button>
        {workspaceOpen && <div className="absolute left-3 right-3 top-[76px] z-10 rounded-lg border border-ink-600 bg-ink-800 p-1.5 shadow-xl"><button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-ink-200 hover:bg-ink-700">Switch workspace</button><button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-ink-200 hover:bg-ink-700">Workspace settings</button></div>}
      </div>

      {searchOpen && <div className="mx-3 mt-4 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-850 px-3 py-2"><Search className="h-3.5 w-3.5 text-ink-400" /><input autoFocus placeholder="Search" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-ink-400" onBlur={() => setSearchOpen(false)} /></div>}

      <nav className="mt-7 flex-1 px-3">
        <div className="mb-2 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">Platform</div>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const active = activeItem === item.label;
            return <button key={item.label} onClick={() => onNavigate(item.label)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium transition-all ${active ? 'bg-cyan-400/10 text-cyan-300 shadow-[inset_2px_0_0_#22d3ee]' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'}`}><Icon className={`h-4 w-4 ${active ? 'text-cyan-400' : 'text-ink-400 group-hover:text-ink-200'}`} strokeWidth={active ? 2 : 1.7} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />}</button>;
          })}
        </div>
        <div className="mb-2 mt-8 px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-ink-500">Manage</div>
        <div className="space-y-1">
          <button onClick={() => setSearchOpen(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"><Search className="h-4 w-4 text-ink-400" />Search</button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"><Settings2 className="h-4 w-4 text-ink-400" />Settings</button>
        </div>
      </nav>

      <div className="border-t border-ink-700/80 p-3">
        <div className="mb-3 rounded-lg border border-cyan-500/15 bg-cyan-400/5 p-3"><div className="flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-wider text-cyan-400">Model status</span><span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Live</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700"><div className="h-full w-[87%] rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" /></div><div className="mt-1.5 flex justify-between font-mono text-[9px] text-ink-400"><span>Confidence</span><span>87.4%</span></div></div>
        <div className="relative flex items-center gap-2.5 rounded-lg px-2 py-2"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-[10px] font-bold text-ink-950">JD</div><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-medium text-ink-100">Jordan Davis</div><div className="text-[10px] text-ink-400">Security Lead</div></div><button onClick={() => setUserOpen(!userOpen)} className="text-ink-400 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>{userOpen && <div className="absolute bottom-11 right-0 z-10 w-36 rounded-lg border border-ink-600 bg-ink-800 p-1.5 shadow-xl"><button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-ink-200 hover:bg-ink-700"><UserRound className="h-3.5 w-3.5" />Profile</button><button className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] text-ink-200 hover:bg-ink-700"><LogOut className="h-3.5 w-3.5" />Sign out</button></div>}</div>
      </div>
    </aside>
  );
}
