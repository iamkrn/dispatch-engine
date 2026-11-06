import { Badge } from '@/components/ui/badge';
import { MapView } from './MapView';
import { RequestsPanel } from './RequestsPanel';
import { useAgentStream } from './useAgentStream';

const ACTIVE_STATUSES = ['pending', 'assigned', 'in_progress'];

export default function App() {
  const { agents, requests, tick, connected } = useAgentStream();
  const activeRequests = requests.filter((r) =>
    ACTIVE_STATUSES.includes(r.status),
  );
  const busyAgents = agents.filter((a) => a.status === 'busy').length;

  return (
    <div className="flex h-screen w-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2 md:px-4 md:py-3">
        <h1 className="text-lg font-semibold">Dispatch Engine</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connected ? 'default' : 'destructive'}>
            {connected ? 'connected' : 'disconnected'}
          </Badge>
          <Badge variant="outline">agents {agents.length}</Badge>
          <Badge variant="outline">busy {busyAgents}</Badge>
          <Badge variant="outline">requests {activeRequests.length}</Badge>
          <Badge variant="outline">tick {tick}</Badge>
        </div>
      </header>
        <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <RequestsPanel requests={activeRequests} />
        <main className="relative min-h-0 flex-1">
          <MapView agents={agents} requests={activeRequests} />
        </main>
      </div>
    </div>
  );
}