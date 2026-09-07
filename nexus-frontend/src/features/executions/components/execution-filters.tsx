import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_ALL = "all";

interface ExecutionFiltersProps {
  status: string;
  from: string;
  to: string;
  rangeError: string | null;
  onChange: (key: "status" | "from" | "to", value: string | null) => void;
  onClear: () => void;
}

export function ExecutionFilters({ status, from, to, rangeError, onChange, onClear }: ExecutionFiltersProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <Select
            value={status}
            onValueChange={(value) => {
              onChange("status", value === STATUS_ALL ? null : value);
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_ALL}>Todos</SelectItem>
              <SelectItem value="SUCCESS">Sucesso</SelectItem>
              <SelectItem value="FAILURE">Falha</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field className="w-44">
          <FieldLabel htmlFor="from">De</FieldLabel>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(event) => {
              onChange("from", event.target.value);
            }}
          />
        </Field>

        <Field className="w-44">
          <FieldLabel htmlFor="to">Até</FieldLabel>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(event) => {
              onChange("to", event.target.value);
            }}
          />
        </Field>

        <Button type="button" variant="ghost" onClick={onClear}>
          Limpar
        </Button>
      </div>

      {rangeError ? (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      ) : null}
    </div>
  );
}
