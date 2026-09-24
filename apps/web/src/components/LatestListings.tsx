'use client';

import { useEffect, useState } from 'react';
import { getJson, Listing, Paginated } from '@/lib/api-client';

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; listings: Listing[]; total: number }
  | { kind: 'error'; message: string };

const priceFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

const statusLabel: Record<Listing['status'], string> = {
  ACTIVE: 'Available',
  PENDING: 'Offer pending',
  SOLD: 'Sold',
  WITHDRAWN: 'Withdrawn',
};

export function LatestListings() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    getJson<Paginated<Listing>>('mls', '/listings?limit=6&sortBy=createdAt&sortOrder=desc', { cache: 'no-store' })
      .then(({ data, meta }) => setState({ kind: 'loaded', listings: data, total: meta.total }))
      .catch((error: unknown) =>
        setState({ kind: 'error', message: error instanceof Error ? error.message : 'Unknown error' }),
      );
  }, []);

  return (
    <section className="panel" aria-labelledby="listings-heading">
      <div className="panel-head">
        <h2 id="listings-heading">Latest listings</h2>
        {state.kind === 'loaded' && state.total > 0 && (
          <p className="muted">
            Showing {state.listings.length} of {state.total}
          </p>
        )}
      </div>

      {state.kind === 'loading' && <p className="muted">Loading listings…</p>}

      {state.kind === 'error' && (
        <p className="muted">
          Listings could not be loaded: {state.message} If the database is new, run{' '}
          <code>npm run db:migrate</code> first.
        </p>
      )}

      {state.kind === 'loaded' && state.listings.length === 0 && (
        <p className="muted">
          No listings yet. Create one with <code>POST /api/listings</code> in the MLS API documentation, and it will
          appear here.
        </p>
      )}

      {state.kind === 'loaded' && state.listings.length > 0 && (
        <ul className="listing-grid">
          {state.listings.map((l) => (
            <li key={l.id} className="listing">
              <p className="listing-price">{priceFormat.format(Number(l.price))}</p>
              <p className="listing-title">{l.title}</p>
              <p className="muted">
                {l.address}, {l.city}
              </p>
              <p className="muted">
                {[
                  l.bedrooms != null && `${l.bedrooms} bed`,
                  l.bathrooms != null && `${l.bathrooms} bath`,
                  l.areaSqft != null && `${l.areaSqft.toLocaleString()} sq ft`,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="listing-status">{statusLabel[l.status]}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
