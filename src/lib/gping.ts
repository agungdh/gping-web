import { env } from '$env/dynamic/public';
import type { Snapshot } from './types';

export const apiBase = (env.PUBLIC_GPING_API || 'http://127.0.0.1:8080').replace(/\/+$/, '');

/** How many minutes of history to request from the server (default 60 = 1 hour). */
const WINDOW_MINUTES = '60';

export async function fetchSnapshot(signal?: AbortSignal): Promise<Snapshot> {
	const res = await fetch(`${apiBase}/api/json?minutes=${WINDOW_MINUTES}`, { signal });
	if (!res.ok) {
		throw new Error(`gping API responded with ${res.status} ${res.statusText}`);
	}
	return (await res.json()) as Snapshot;
}
