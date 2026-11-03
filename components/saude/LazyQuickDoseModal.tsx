"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";

const DoseDialog = dynamic(
  () => import("./QuickDoseModal").then(module => module.QuickDoseModal),
  {
    loading: () => (
      <p role="status" className="fixed inset-x-4 top-16 z-50 mx-auto max-w-sm rounded-xl border border-surface-border bg-surface p-3 text-sm text-ink-primary shadow-lg">
        Abrindo registro de dose…
      </p>
    ),
  },
);

type Props = ComponentProps<typeof import("./QuickDoseModal").QuickDoseModal>;

export function LazyQuickDoseModal(props: Props) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (props.isOpen) setOpened(true);
  }, [props.isOpen]);

  return opened || props.isOpen ? <DoseDialog {...props} /> : null;
}
