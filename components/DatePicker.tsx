"use client";

import { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { format, parse } from "date-fns";

interface CustomDatePickerProps {
  label?: string;
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

const CustomInput = forwardRef<
  HTMLInputElement,
  { value?: string; onClick?: () => void; placeholder?: string }
>(({ value, onClick, placeholder }, ref) => (
  <div className="relative">
    <input
      ref={ref}
      type="text"
      value={value || ""}
      onClick={onClick}
      readOnly
      placeholder={placeholder || "Selecione uma data"}
      className="w-full cursor-pointer rounded-2xl border border-surface-border/50 bg-surface-raised px-4 py-3 pr-10 text-ink-primary placeholder:text-ink-muted focus:border-ice/50 focus:outline-none transition-colors"
    />
    <CalendarIcon
      size={17}
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
    />
  </div>
));
CustomInput.displayName = "CustomInput";

export function CustomDatePicker({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  className,
}: CustomDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? parse(value, "yyyy-MM-dd", new Date()) : null
  );

  const handleChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      const formatted = format(date, "yyyy-MM-dd");
      onChange(formatted);
    } else {
      onChange("");
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-ink-primary">
          {label} {required && <span className="text-coral">*</span>}
        </label>
      )}

      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        locale={ptBR}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder || "Selecione a data"}
        customInput={<CustomInput />}
        popperClassName="!z-50"
        calendarClassName={`
          !rounded-2xl !border !border-surface-border/50 !bg-surface !shadow-vault
          [&_.react-datepicker__triangle]:!hidden
          [&_.react-datepicker__header]:!border-surface-border/50
          [&_.react-datepicker__header]:!bg-surface-raised
          [&_.react-datepicker__current-month]:!text-ink-primary
          [&_.react-datepicker__day-name]:!text-ink-muted
          [&_.react-datepicker__day]:!text-ink-primary
          [&_.react-datepicker__day]:!rounded-lg
          [&_.react-datepicker__day]:!hover:bg-ice/15
          [&_.react-datepicker__day--selected]:!bg-ice
          [&_.react-datepicker__day--selected]:!text-void
          [&_.react-datepicker__day--keyboard-selected]:!bg-ice/25
          [&_.react-datepicker__day--keyboard-selected]:!text-ink-primary
          [&_.react-datepicker__day--today]:!font-bold
          [&_.react-datepicker__day--today]:!text-ice
          [&_.react-datepicker__day--outside-month]:!text-ink-muted/45
          [&_.react-datepicker__navigation-icon::before]:!border-ink-muted
          [&_.react-datepicker__year-dropdown]:!border-surface-border/50
          [&_.react-datepicker__year-dropdown]:!bg-surface
          [&_.react-datepicker__year-option]:!text-ink-primary
          [&_.react-datepicker__year-option]:!hover:bg-surface-raised
          [&_.react-datepicker__month-dropdown]:!border-surface-border/50
          [&_.react-datepicker__month-dropdown]:!bg-surface
          [&_.react-datepicker__month-option]:!text-ink-primary
          [&_.react-datepicker__month-option]:!hover:bg-surface-raised
        `}
        popperPlacement="bottom-start"
        showYearDropdown
        scrollableYearDropdown
        yearDropdownItemNumber={100}
      />

      {error && <p className="mt-1 text-xs text-coral">{error}</p>}
    </div>
  );
}