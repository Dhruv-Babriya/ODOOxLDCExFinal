interface ModuleShellProps {
  title: string;
  subtitle: string;
  developerOwner?: string;
  developerRole?: string;
  tables?: string[];
  contracts?: string[];
  phase1Roadmap?: string[];
  children?: React.ReactNode;
}

export function DashboardModuleShell({
  title,
  subtitle,
  children,
}: ModuleShellProps) {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
        </div>
      </div>

      {/* Main Content Area */}
      {children}
    </div>
  );
}
