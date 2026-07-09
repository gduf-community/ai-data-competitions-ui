"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectContextValue {
  value: string;
  setValue: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  name?: string;
  required?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(componentName: string) {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error(`${componentName} must be used within Select.`);
  }
  return context;
}

function nodeToText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeToText).join("");
  }
  if (React.isValidElement(node)) {
    return nodeToText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function collectOptions(node: React.ReactNode, result: SelectOption[] = []) {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) {
      return;
    }

    if (child.type === SelectItem) {
      const props = child.props as {
        value: string;
        disabled?: boolean;
        children?: React.ReactNode;
      };

      result.push({
        value: props.value,
        label: nodeToText(props.children),
        disabled: props.disabled,
      });
      return;
    }

    const nested = (child.props as { children?: React.ReactNode }).children;
    if (nested) {
      collectOptions(nested, result);
    }
  });

  return result;
}

function findPlaceholder(node: React.ReactNode): string | undefined {
  let placeholder: string | undefined;

  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child) || placeholder) {
      return;
    }

    if (child.type === SelectValue) {
      const props = child.props as { placeholder?: string };
      if (props.placeholder) {
        placeholder = props.placeholder;
      }
      return;
    }

    const nested = (child.props as { children?: React.ReactNode }).children;
    if (nested) {
      placeholder = findPlaceholder(nested) ?? placeholder;
    }
  });

  return placeholder;
}

function Select({
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  required,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = React.useState(defaultValue ?? "");

  const currentValue = isControlled ? (value ?? "") : innerValue;
  const options = React.useMemo(() => collectOptions(children), [children]);

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setInnerValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        setValue,
        options,
        disabled,
        name,
        required,
      }}
    >
      {children}
    </SelectContext.Provider>
  );
}

function SelectGroup({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  void placeholder;
  return null;
}

function SelectTrigger({
  className,
  triggerSize = "default",
  children,
  ...props
}: React.ComponentProps<"select"> & {
  triggerSize?: "sm" | "default";
}) {
  const context = useSelectContext("SelectTrigger");
  const placeholder = findPlaceholder(children);
  const shouldShowPlaceholder = Boolean(placeholder && context.value === "");

  return (
    <div className="relative">
      <select
        data-slot="select-trigger"
        data-size={triggerSize}
        className={cn(
          "border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full appearance-none items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 pr-8 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8",
          className,
        )}
        value={context.value}
        onChange={(event) => context.setValue(event.target.value)}
        disabled={context.disabled || props.disabled}
        name={context.name ?? props.name}
        required={context.required ?? props.required}
        data-placeholder={shouldShowPlaceholder ? "true" : "false"}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {context.options.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 opacity-50" />
    </div>
  );
}

function SelectContent({ children }: { children?: React.ReactNode }) {
  void children;
  return null;
}

function SelectLabel({ children }: { children?: React.ReactNode }) {
  void children;
  return null;
}

function SelectItem({
  children,
}: {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  void children;
  return null;
}

function SelectSeparator() {
  return null;
}

function SelectScrollUpButton() {
  return null;
}

function SelectScrollDownButton() {
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
