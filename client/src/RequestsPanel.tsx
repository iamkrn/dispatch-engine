import type { Request as DispatchRequest } from '@dispatch/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

const AMRITSAR_CENTER = { lat: 31.634, lng: 74.8723 };

interface RequestsPanelProps {
  requests: DispatchRequest[];
}

function randomNearCenter() {
  return {
    lat: AMRITSAR_CENTER.lat + (Math.random() - 0.5) * 0.08,
    lng: AMRITSAR_CENTER.lng + (Math.random() - 0.5) * 0.1,
  };
}

async function createRequest(requiredType: 'ambulance' | 'cab') {
  await fetch(`${API_URL}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requiredType,
      priority: 'high',
      location: randomNearCenter(),
    }),
  });
}

async function updateStatus(id: string, status: string) {
  await fetch(`${API_URL}/requests/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

function statusVariant(status: string) {
  if (status === 'pending') return 'secondary' as const;
  return 'default' as const;
}

export function RequestsPanel({ requests }: RequestsPanelProps) {
  const sorted = [...requests].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <aside className="flex h-64 w-full flex-col gap-3 border-t bg-background p-3 md:h-full md:w-80 md:border-r md:border-t-0 md:p-4">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => createRequest('ambulance')}>
          New ambulance
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          onClick={() => createRequest('cab')}
        >
          New cab
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No active requests</p>
        )}
        {sorted.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{r.requiredType}</span>
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                agent: {r.assignedAgentId ?? 'none'}
              </div>
              <div className="flex gap-2">
                {r.status === 'assigned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(r.id, 'in_progress')}
                  >
                    Start
                  </Button>
                )}
                {(r.status === 'assigned' || r.status === 'in_progress') && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(r.id, 'completed')}
                  >
                    Complete
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateStatus(r.id, 'cancelled')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </aside>
  );
}