"use client";
import { CustomDatePicker } from "@/components/DatePicker";
import { HealthTimePicker } from "./HealthTimePicker";

/** Horário civil editável; conversão para instante permanece no fluxo de doses. */
export function HealthDateTimePicker({ value, onChange, disabled = false, min, max, className = "" }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
  min?: string; max?: string; className?: string;
}) {
  const [date = "", time = ""] = value.split("T");
  return <fieldset disabled={disabled} className={`${className} min-w-0 space-y-2 disabled:opacity-50`}>
    <CustomDatePicker value={date} minDate={min?.slice(0,10)} maxDate={max?.slice(0,10)} onChange={next => onChange(next ? `${next}T${time || "00:00"}` : "")} />
    <HealthTimePicker value={time.slice(0,5)} onChange={next => onChange(next && date ? `${date}T${next}` : "")} />
  </fieldset>;
}
