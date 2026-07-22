"use client";

import { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { format, parse } from "date-fns";

interface CustomDatePickerProps {
  label?: string;
  value?: string; // formato "yyyy-MM-dd"
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  className?: string;
}

// Componente de input personalizado para o DatePicker
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
      className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-surface-border/50 text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-ice transition-colors cursor-pointer pr-10"
    />
    <CalendarIcon
      size={18}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
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
        <label className="block text-sm font-medium text-ink-primary mb-1.5">
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
        // ✅ CORRIGIDO: Estilos para ambos os temas
        calendarClassName={`
          !bg-surface !border !border-surface-border/50 rounded-xl shadow-vault
          [&_.react-datepicker__header]:!bg-surface-raised [&_.react-datepicker__header]:!border-surface-border/50
          [&_.react-datepicker__current-month]:!text-ink-primary
          [&_.react-datepicker__day-name]:!text-ink-muted
          [&_.react-datepicker__day]:!text-ink-primary [&_.react-datepicker__day]:!hover:bg-ice/20
          [&_.react-datepicker__day--selected]:!bg-ice [&_.react-datepicker__day--selected]:!text-void
          [&_.react-datepicker__day--keyboard-selected]:!bg-ice/30 [&_.react-datepicker__day--keyboard-selected]:!text-ink-primary
          [&_.react-datepicker__day--today]:!text-ice [&_.react-datepicker__day--today]:!font-bold
          [&_.react-datepicker__day--outside-month]:!text-ink-muted/50
          [&_.react-datepicker__navigation-icon::before]:!border-ink-muted
          [&_.react-datepicker__year-dropdown]:!bg-surface [&_.react-datepicker__year-dropdown]:!border-surface-border/50
          [&_.react-datepicker__year-option]:!text-ink-primary [&_.react-datepicker__year-option]:!hover:bg-surface-raised
          [&_.react-datepicker__month-dropdown]:!bg-surface [&_.react-datepicker__month-dropdown]:!border-surface-border/50
          [&_.react-datepicker__month-option]:!text-ink-primary [&_.react-datepicker__month-option]:!hover:bg-surface-raised
        `}
        popperPlacement="bottom-start"
        showYearDropdown
        scrollableYearDropdown
        yearDropdownItemNumber={100}
      />
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );
}