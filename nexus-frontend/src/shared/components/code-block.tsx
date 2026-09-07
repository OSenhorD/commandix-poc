import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TRUNCATION_SUFFIX = "… [truncated]";

export function CodeBlock({
  title,
  content,
  emptyLabel,
}: {
  title: string;
  content: string | null;
  emptyLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const isTruncated = content?.endsWith(TRUNCATION_SUFFIX) ?? false;

  const handleCopy = async () => {
    if (content === null) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {content === null ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Copiar ${title}`}
            onClick={() => {
              void handleCopy();
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        )}
      </header>

      {content === null ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ScrollArea className="max-h-80 rounded-md border">
          <pre className="p-3 font-mono text-xs whitespace-pre-wrap break-all">{content}</pre>
        </ScrollArea>
      )}

      {isTruncated ? (
        <p className="text-xs text-muted-foreground">
          Resposta truncada em 10 240 bytes pela API — o corpo original era maior.
        </p>
      ) : null}
    </section>
  );
}
