"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { QuickDoseModal as DoseDialog } from "./QuickDoseModal";

// Clinical offline contract: ship the dose dialog with the route's initial JS.
// Keep deferred mounting so closed dialogs do not start clinical hooks.
type Props = ComponentProps<typeof DoseDialog>;

export function LazyQuickDoseModal(props: Props) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (props.isOpen) setOpened(true);
  }, [props.isOpen]);

  return opened || props.isOpen ? <DoseDialog {...props} /> : null;
}
