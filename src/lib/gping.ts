import { env } from '$env/dynamic/public';
import type { Snapshot } from './types';

// Same-origin by default (the gping HTTP server serves this UI and its API from
// one port). Set PUBLIC_GPING_API when the UI is hosted separately from the API.
export const apiBase = (env.PUBLIC_GPING_API || '').replace(/\/+$/, '');

/** How many minutes of history to request from the server (default 15). */
const WINDOW_MINUTES = '15';

export async function fetchSnapshot(signal?: AbortSignal): Promise<Snapshot> {
	const res = await fetch(`${apiBase}/api/json?minutes=${WINDOW_MINUTES}`, { signal });
	if (!res.ok) {
		throw new Error(`gping API responded with ${res.status} ${res.statusText}`);
	}
	return (await res.json()) as Snapshot;
}
