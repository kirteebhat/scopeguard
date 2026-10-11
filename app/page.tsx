export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          ScopeGuard Platform Scaffolding
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Eliminate Unbilled Scope Creep
        </h1>
        <p className="text-base text-slate-600 sm:text-lg">
          Transform informal scope adjustments into formal, client-approved change orders with transparent impact modeling.
        </p>
      </div>
    </main>
  );
}

