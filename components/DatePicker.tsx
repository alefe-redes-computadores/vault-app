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
        calendarClassName="!bg-surface !border !border-surface-border rounded-xl shadow-vault"
        popperPlacement="bottom-start"
        showYearDropdown
        scrollableYearDropdown
        yearDropdownItemNumber={100}
      />
      {error && <p className="text-xs text-coral mt-1">{error}</p>}
    </div>
  );
}