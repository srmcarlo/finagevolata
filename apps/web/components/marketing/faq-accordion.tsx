"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <Accordion.Root className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {items.map((item, i) => (
        <Accordion.Item key={i} className="group">
          <Accordion.Header>
            <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left text-base font-semibold text-slate-900 transition hover:bg-slate-50">
              <span>{item.question}</span>
              <ChevronDown className="size-5 shrink-0 text-slate-500 transition group-data-[panel-open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="px-6 pb-4 text-sm leading-relaxed text-slate-600">
            {item.answer}
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
