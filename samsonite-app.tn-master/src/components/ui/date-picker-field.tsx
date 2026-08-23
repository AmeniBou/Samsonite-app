import * as React from "react";
import { CalendarDays, X } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { enUS, fr } from "date-fns/locale";

import { AppSelect } from "@/components/ui/app-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NativeDateProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "onChange" | "type" | "value"
>;

export interface DatePickerFieldProps extends NativeDateProps {
  locale?: "en" | "fr";
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  value?: string;
}

const parseDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const DatePickerField = React.forwardRef<HTMLButtonElement, DatePickerFieldProps>(({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultValue = "",
  disabled,
  id,
  locale,
  max,
  min,
  name,
  onChange,
  placeholder,
  required,
  value,
}, ref) => {
  const { language } = useLanguage();
  const effectiveLocale = locale ?? language;
  const dateLocale = effectiveLocale === "en" ? enUS : fr;
  const text = effectiveLocale === "en"
    ? { clear: "Clear date", month: "Month", placeholder: "Select a date", year: "Year" }
    : { clear: "Effacer la date", month: "Mois", placeholder: "Sélectionner une date", year: "Année" };
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const selectedValue = isControlled ? value : internalValue;
  const selectedDate = parseDate(selectedValue);
  const minDate = typeof min === "string" ? parseDate(min) : undefined;
  const maxDate = typeof max === "string" ? parseDate(max) : undefined;
  const currentYear = new Date().getFullYear();
  const startYear = minDate?.getFullYear() ?? (maxDate ? maxDate.getFullYear() - 100 : currentYear - 15);
  const endYear = maxDate?.getFullYear() ?? currentYear + 10;
  const [visibleMonth, setVisibleMonth] = React.useState(selectedDate ?? maxDate ?? new Date());
  const monthOptions = React.useMemo(
    () => Array.from({ length: 12 }, (_, month) => ({
      label: format(new Date(2024, month, 1), "MMMM", { locale: dateLocale }),
      value: month,
    })),
    [dateLocale],
  );
  const yearOptions = React.useMemo(
    () => Array.from({ length: endYear - startYear + 1 }, (_, index) => endYear - index),
    [endYear, startYear],
  );

  React.useEffect(() => {
    const nextSelectedDate = parseDate(selectedValue);
    if (nextSelectedDate) setVisibleMonth(nextSelectedDate);
  }, [selectedValue]);

  const emitChange = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    if (onChange) {
      const target = { name: name ?? "", value: nextValue } as HTMLInputElement;
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <Popover>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            disabled={disabled}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-required={required || undefined}
            className={cn(
              "app-date-picker-trigger app-form-control flex w-full items-center gap-2 px-3 text-left",
              !selectedDate && "text-gray-400",
              className,
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="min-w-0 flex-1 truncate">
              {selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: dateLocale }) : (placeholder ?? text.placeholder)}
            </span>
          </button>
        </PopoverTrigger>
        {selectedDate && !disabled && (
          <button
            type="button"
            aria-label={text.clear}
            onClick={(event) => {
              event.stopPropagation();
              emitChange("");
            }}
            className="absolute right-9 top-1/2 z-10 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-auto rounded-xl border-0 bg-transparent p-0 shadow-none">
        <div className="rounded-xl border border-gray-200 bg-white shadow-[0_18px_48px_rgba(17,24,39,0.12)]">
          <div className="flex items-center gap-2 px-2.5 pt-2.5">
            <AppSelect
              aria-label={text.month}
              value={visibleMonth.getMonth()}
              onChange={(event) => setVisibleMonth(new Date(visibleMonth.getFullYear(), Number(event.target.value), 1))}
              className="calendar-period-select min-w-[7.5rem] flex-1 capitalize"
            >
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </AppSelect>
            <AppSelect
              aria-label={text.year}
              value={visibleMonth.getFullYear()}
              onChange={(event) => setVisibleMonth(new Date(Number(event.target.value), visibleMonth.getMonth(), 1))}
              className="calendar-period-select w-[5.25rem]"
            >
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </AppSelect>
          </div>
          <Calendar
            mode="single"
            locale={dateLocale}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            selected={selectedDate}
            onSelect={(date) => {
              if (date) setVisibleMonth(date);
              emitChange(date ? format(date, "yyyy-MM-dd") : "");
            }}
            disabled={(date) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate))}
            initialFocus
            className="border-0 pt-1 shadow-none"
          />
        </div>
      </PopoverContent>
      {name && <input type="hidden" name={name} value={selectedValue} />}
    </Popover>
  );
});
DatePickerField.displayName = "DatePickerField";

export { DatePickerField };
