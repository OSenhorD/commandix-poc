import { Badge } from "@/components/ui/badge";
import type { IntegrationType } from "@/shared/types/api";

const LABELS: Record<IntegrationType, string> = {
  WEBHOOK: "Webhook",
  REST_API: "REST API",
  N8N: "n8n",
};

export function IntegrationTypeBadge({ type }: { type: IntegrationType }) {
  return <Badge variant="outline">{LABELS[type]}</Badge>;
}
