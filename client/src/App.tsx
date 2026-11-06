import { MapView } from './MapView';
import { useAgentStream } from './useAgentStream';

const ACTIVE_STATUSES = ['pending', 'assigned', 'in_progress'];

export default function App() {
  const { agents, requests, tick, connected } = useAgentStream();
  const activeRequests = requests.filter((r) =>
    ACTIVE_STATUSES.includes(r.status),
  );

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <MapView agents={agents} requests={activeRequests} />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 13,
          borderRadius: 6,
          zIndex: 10,
        }}
      >
        <div>{connected ? '🟢 connected' : '🔴 disconnected'}</div>
        <div>agents: {agents.length}</div>
        <div>active requests: {activeRequests.length}</div>
        <div>tick: {tick}</div>
        
      </div>
    </div>
  );
}