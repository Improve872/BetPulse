export default function Loading() {
  return (
    <div className="min-h-screen bg-paper" aria-busy="true">
      <span className="sr-only">Cargando partidas</span>

      <div className="h-16 border-b border-white/10 bg-navy">
        <div className="mx-auto flex h-full max-w-[1320px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="h-7 w-32 animate-pulse rounded-md bg-white/10" />
          <div className="hidden gap-6 md:flex">
            <div className="h-3 w-14 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
        </div>
      </div>

      <div className="h-10 border-b border-white/10 bg-navy-soft" />

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-3 w-16 animate-pulse rounded bg-orange-200/70" />
        <div className="mt-3 h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-72 animate-pulse rounded bg-slate-200/70" />

        <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
          <div className="hidden h-80 animate-pulse rounded-2xl border border-line bg-surface lg:block" />

          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
              >
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="space-y-3 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
                <div className="h-11 border-t border-line bg-slate-50" />
              </div>
            ))}
          </div>

          <div className="hidden h-72 animate-pulse rounded-2xl border border-line bg-surface lg:block" />
        </div>
      </main>
    </div>
  );
}
