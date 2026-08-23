import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__app_select_empty_value__";

type NativeSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "defaultValue" | "multiple" | "onChange" | "size" | "value"
>;

export interface AppSelectProps extends NativeSelectProps {
  children: React.ReactNode;
  defaultValue?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  value?: string | number;
}

type SelectOption = {
  disabled: boolean;
  label: React.ReactNode;
  textLabel: string;
  value: string;
};

const getTextLabel = (label: React.ReactNode): string => {
  if (typeof label === "string" || typeof label === "number") return String(label);
  return React.Children.toArray(label).map(getTextLabel).join("");
};

const readOptions = (children: React.ReactNode): SelectOption[] =>
  React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return [];
    if (child.type !== "option") return [];

    const label = child.props.children;
    return [{
      disabled: Boolean(child.props.disabled),
      label,
      textLabel: getTextLabel(label),
      value: String(child.props.value ?? getTextLabel(label)),
    }];
  });

const toInternalValue = (value: string) => value === "" ? EMPTY_VALUE : value;
const fromInternalValue = (value: string) => value === EMPTY_VALUE ? "" : value;

const AppSelect = React.forwardRef<HTMLButtonElement, AppSelectProps>(({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  children,
  className,
  defaultValue,
  disabled,
  id,
  name,
  onBlur,
  onChange,
  onFocus,
  required,
  value,
}, ref) => {
  const options = React.useMemo(() => readOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(() => String(defaultValue ?? ""));
  const requestedValue = isControlled ? String(value) : internalValue;
  const selectedValue = options.some((option) => option.value === requestedValue)
    ? requestedValue
    : (options[0]?.value ?? "");
  const selectedOption = options.find((option) => option.value === selectedValue);

  const handleValueChange = (nextInternalValue: string) => {
    const nextValue = fromInternalValue(nextInternalValue);
    if (!isControlled) setInternalValue(nextValue);

    if (onChange) {
      const target = { name: name ?? "", value: nextValue } as HTMLSelectElement;
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
    }
  };

  return (
    <>
      <Select
        disabled={disabled}
        value={toInternalValue(selectedValue)}
        onValueChange={handleValueChange}
      >
        <SelectTrigger
          ref={ref}
          id={id}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-label={ariaLabel}
          aria-required={required || undefined}
          className={cn("app-select-trigger text-left", className)}
          onBlur={onBlur as React.FocusEventHandler<HTMLButtonElement> | undefined}
          onFocus={onFocus as React.FocusEventHandler<HTMLButtonElement> | undefined}
        >
          <span className={cn("min-w-0 flex-1 truncate", selectedValue === "" && "text-gray-400")}>
            {selectedOption?.label}
          </span>
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-64">
          {options.map((option) => (
            <SelectItem
              key={`${option.value}-${option.textLabel}`}
              value={toInternalValue(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={selectedValue} />}
    </>
  );
});
AppSelect.displayName = "AppSelect";

export { AppSelect };
