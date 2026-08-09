export interface PingPoint {
	/** Unix timestamp in seconds */
	t: number;
	/** Latency in microseconds, or null when the ping timed out */
	latency_us: number | null;
}

export interface HostStats {
	last_us: number | null;
	min_us: number | null;
	max_us: number | null;
	avg_us: number | null;
	jitter_us: number | null;
	p95_us: number | null;
	timeouts: number | null;
}

export interface Host {
	display: string;
	data: PingPoint[];
	stats: HostStats;
}

export interface Snapshot {
	name: string;
	version: string;
	retention_secs: number;
	window_secs: number;
	hosts: Host[];
}
