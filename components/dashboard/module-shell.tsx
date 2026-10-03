import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

interface ModuleShellProps {
  title: string;
  subtitle: string;
  developerOwner: string;
  developerRole: string;
  tables: string[];
  contracts: string[];
  phase1Roadmap: string[];
  children?: React.ReactNode;
}

export function DashboardModuleShell({
  title,
  subtitle,
  developerOwner,
  developerRole,
  tables,
  contracts,
  phase1Roadmap,
  children,
}: ModuleShellProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-950/20">
              Phase 0 Scaffold
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 block font-semibold">Assigned Owner</span>
            <span className="text-xs font-medium text-emerald-400 font-mono block">{developerOwner}</span>
            <span className="text-[11px] text-zinc-400 block">{developerRole}</span>
          </div>
        </div>
      </div>

      {/* Architecture Spec Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Database className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm">Database Tables Owned</CardTitle>
            </div>
            <CardDescription className="text-xs">PostgreSQL normalized tables with RLS active</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {tables.map((tbl) => (
              <div key={tbl} className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-zinc-950/50 px-2.5 py-1 rounded border border-zinc-800/80">
                <span className="text-emerald-400">●</span>
                <span>public.{tbl}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Layers className="h-4 w-4 text-sky-400" />
              <CardTitle className="text-sm">Shared Integration Contracts</CardTitle>
            </div>
            <CardDescription className="text-xs">Types, Enums & Zod Schemas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {contracts.map((c) => (
              <div key={c} className="flex items-center gap-2 text-xs font-mono text-zinc-300 bg-zinc-950/50 px-2.5 py-1 rounded border border-zinc-800/80">
                <span className="text-sky-400">▸</span>
                <span>{c}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-sm">Phase 1 Development Plan</CardTitle>
            </div>
            <CardDescription className="text-xs">Next phase execution priorities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {phase1Roadmap.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {children}
    </div>
  );
}
