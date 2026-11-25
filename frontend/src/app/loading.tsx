export default function Loading() {
  return (
    <div className="min-h-screen bg-paper" aria-busy="true">
      <span className="sr-only">Cargando la cartelera</span>

      <div className="bg-masthead">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-7">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-white/15" />
          <div className="ml-4 hidden gap-5 lg:flex">
            <div className="h-3 w-12 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-14 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-3 w-14 animate-pulse rounded bg-white/15" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-white/10" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-accent/50" />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white shadow-[0_1px_0_#e2e8f0]">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 sm:px-7">
          {[88, 62, 52, 74].map((width) => (
            <div
              key={width}
              className="h-3.5 animate-pulse rounded bg-slate-200"
              style={{ width }}
            />
          ))}
          <div className="ml-auto hidden h-10 w-[300px] animate-pulse rounded-lg bg-slate-100 lg:block" />
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="grid gap-3 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[214px] animate-pulse rounded-xl bg-slate-300/60 sm:h-[232px]"
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="h-7 w-52 animate-pulse rounded bg-slate-300/60" />
              <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200" />
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
              <div className="h-10 bg-[#f5f8fb]" />
              {[0, 1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="flex min-h-[78px] items-center gap-4 border-t border-line px-4"
                >
                  <div className="h-3 w-9 animate-pulse rounded bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-48 animate-pulse rounded bg-slate-200" />
                    <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200" />
                  </div>
                  <div className="hidden gap-1 md:flex">
                    {[0, 1, 2].map((cell) => (
                      <div
                        key={cell}
                        className="h-11 w-[78px] animate-pulse rounded-md bg-slate-100"
                      />
                    ))}
                  </div>
                  <div className="hidden gap-1 md:flex">
                    {[0, 1].map((cell) => (
                      <div
                        key={cell}
                        className="h-11 w-[88px] animate-pulse rounded-md bg-slate-100"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden xl:block">
            <div className="h-44 animate-pulse rounded-xl border border-line bg-white" />
          </div>
        </div>
      </main>
    </div>
  );
}
