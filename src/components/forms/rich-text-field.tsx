"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { RichTextEditor } from "./rich-text-editor";

interface RichTextFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  className?: string;
  required?: boolean;
  editorKey?: string;
}

export function RichTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  className,
  required = false,
  editorKey,
}: RichTextFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      <RichTextEditor
        key={editorKey}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}
