import { LatestListings } from '@/components/LatestListings';
import { ServiceStatus } from '@/components/ServiceStatus';
import { missingPublicConfig, publicConfig } from '@/config/public-config';
import { getServerConfig } from '@/config/server-config';

// Read APP_ENV on every request instead of freezing it at build time.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { appEnv } = getServerConfig();
  const missing = missingPublicConfig();

  return (
    <main className="page">
      <header className="masthead">
        <h1 className="wordmark">{publicConfig.appName}</h1>
        <p className="lede">
          The web app is running{appEnv ? <> in the <strong>{appEnv}</strong> environment</> : null}. Below is a live check
          of the services it talks to.
        </p>
        {!appEnv && <p className="notice">APP_ENV is not set. Add it to the root .env file (see .env.example).</p>}
        {missing.length > 0 && (
          <p className="notice">
            Missing or invalid: {missing.join(', ')}. Add them to the root .env file and restart the dev server.
          </p>
        )}
      </header>

      <ServiceStatus />
      <LatestListings />
    </main>
  );
}
