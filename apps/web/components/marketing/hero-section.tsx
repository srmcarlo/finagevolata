import { ReactNode } from "react";

interface HeroSectionProps {
  children: ReactNode;
  visual?: ReactNode;
}

export function HeroSection({ children, visual }: HeroSectionProps) {
  return (
    <section
      className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white"
      style={{
        backgroundImage:
          "radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.10), transparent 50%), radial-gradient(circle at 100% 100%, rgba(236, 72, 153, 0.06), transparent 50%)",
      }}
    >
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div className="flex flex-col justify-center">{children}</div>
        {visual ? <div className="flex items-center justify-center">{visual}</div> : null}
      </div>
    </section>
  );
}
