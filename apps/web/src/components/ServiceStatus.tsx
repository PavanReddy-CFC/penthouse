'use client';

import { useCallback, useEffect, useState } from 'react';
import { publicConfig } from '@/config/public-config';
import { getJson, HealthResponse, ServiceKey } from '@/lib/api-client';

type CheckState =
  | { kind: 'checking' }
  | { kind: 'reachable'; health: HealthResponse }
  | { kind: 'unreachable'; message: string };

const services: { key: ServiceKey; name: string; url: string; docsUrl: string }[] = [
  { key: 'api', name: 'Main API', url: publicConfig.apiUrl, docsUrl: publicConfig.apiDocsUrl },
  { key: 'mls', name: 'MLS API', url: publicConfig.mlsApiUrl, docsUrl: publicConfig.mlsApiDocsUrl },
];

export function ServiceStatus() {
  const [states, setStates] = useState<Record<ServiceKey, CheckState>>({
    api: { kind: 'checking' },
    mls: { kind: 'checking' },
  });

  const check = useCallback(async () => {
    setStates({ api: { kind: 'checking' }, mls: { kind: 'checking' } });
    await Promise.all(
      services.map(async ({ key }) => {
        let next: CheckState;
        try {
          next = { kind: 'reachable', health: await getJson<HealthResponse>(key, '/health', { cache: 'no-store' }) };
        } catch (error) {
          next = { kind: 'unreachable', message: error instanceof Error ? error.message : 'Unknown error' };
        }
        setStates((prev) => ({ ...prev, [key]: next }));
      }),
    );
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <section className="panel" aria-labelledby="status-heading">
      <div className="panel-head">
        <h2 id="status-heading">Backend services</h2>
        <button type="button" className="button" onClick={() => void check()}>
          Check again
        </button>
      </div>
      <ul className="service-list">
        {services.map((s) => (
          <ServiceRow key={s.key} name={s.name} url={s.url} docsUrl={s.docsUrl} state={states[s.key]} />
        ))}
      </ul>
    </section>
  );
}

function ServiceRow({
  name,
  url,
  docsUrl,
  state,
}: {
  name: string;
  url: string;
  docsUrl: string;
  state: CheckState;
}) {
  const tone =
    state.kind === 'checking'
      ? 'pending'
      : state.kind === 'unreachable'
        ? 'bad'
        : state.health.status === 'ok'
          ? 'good'
          : 'warn';

  const summary =
    state.kind === 'checking'
      ? 'Checking…'
      : state.kind === 'unreachable'
        ? state.message
        : state.health.database === 'up'
          ? `Running in ${state.health.appEnv}, database connected`
          : `Running in ${state.health.appEnv}, but the database is not reachable. Check DATABASE_URL.`;

  const dependencies =
    state.kind === 'reachable'
      ? [
          state.health.redis && `Redis ${dependencyLabel[state.health.redis]}`,
          state.health.elasticsearch && `Elasticsearch ${dependencyLabel[state.health.elasticsearch]}`,
        ].filter(Boolean)
      : [];

  return (
    <li className="service">
      <span className={`dot dot-${tone}`} aria-hidden="true" />
      <div>
        <p className="service-name">{name}</p>
        <p className="service-url">{url || 'URL not configured'}</p>
        <p className="service-summary" role="status">
          {summary}
        </p>
        {dependencies.length > 0 && <p className="service-deps">{dependencies.join(', ')}</p>}
        {docsUrl && (
          <p className="service-docs">
            <a href={docsUrl} target="_blank" rel="noreferrer">
              Open API documentation
            </a>
          </p>
        )}
      </div>
    </li>
  );
}

const dependencyLabel: Record<'up' | 'down' | 'disabled', string> = {
  up: 'connected',
  down: 'not reachable',
  disabled: 'turned off',
};
