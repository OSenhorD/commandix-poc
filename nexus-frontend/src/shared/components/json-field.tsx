import type { ComponentProps } from "react";
import type { FieldError as RhfFieldError } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface JsonFieldProps extends ComponentProps<typeof Textarea> {
  id: string;
  label: string;
  description?: string;
  error?: RhfFieldError;
}

export function JsonField({ id, label, description, error, ...props }: JsonFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} rows={5} spellCheck={false} className="font-mono text-xs" {...props} />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={[error]} />
    </Field>
  );
}
