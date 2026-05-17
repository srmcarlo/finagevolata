const NUMBERS = [
  { value: "10+", label: "consulenti beta attivi" },
  { value: "50+", label: "pratiche tracciate" },
  { value: "200+", label: "documenti gestiti" },
  { value: "100%", label: "italiano + GDPR" },
];

export function NumbersStrip() {
  return (
    <section className="border-b border-slate-200 bg-white py-12 md:py-14">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-indigo-600">
          FinAgevolata oggi
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base text-slate-600">
          Numeri della nostra community beta, in crescita ogni settimana.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          {NUMBERS.map((n) => (
            <div
              key={n.label}
              className="flex flex-col items-center rounded-lg border border-indigo-100 bg-indigo-50/40 px-4 py-5 text-center"
            >
              <div className="text-2xl font-bold tracking-tight text-indigo-700 md:text-3xl">
                {n.value}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-600 md:text-sm">
                {n.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
