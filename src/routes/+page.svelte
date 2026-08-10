<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Snapshot, Host } from '$lib/types';
	import { fetchSnapshot, apiBase } from '$lib/gping';
	import LatencyChart from '$lib/components/LatencyChart.svelte';

	const POLL_MS = 2000;

	let snapshot: Snapshot | null = $state(null);
	let error: string | null = $state(null);
	let connected = $state(false);
	let lastUpdated: number | null = $state(null);

	let controller: AbortController | null = null;
	let timer: ReturnType<typeof setInterval> | null = null;

	async function poll() {
		controller?.abort();
		controller = new AbortController();
		try {
			const next = await fetchSnapshot(controller.signal);
			snapshot = next;
			error = null;
			connected = true;
			lastUpdated = Date.now();
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			connected = false;
			error = e instanceof Error ? e.message : String(e);
		}
	}

	onMount(() => {
		poll();
		timer = setInterval(poll, POLL_MS);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		controller?.abort();
	});

	const hosts: Host[] = $derived.by(() => snapshot?.hosts ?? []);
	const retentionLabel = $derived.by(() => {
		const secs = snapshot?.retention_secs;
		if (!secs) return 'retention';
		if (secs % 3600 === 0) return `${secs / 3600}h`;
		if (secs % 60 === 0) return `${secs / 60}m`;
		return `${secs}s`;
	});
	const palette = ['#22d3ee', '#a3e635', '#f472b6', '#fbbf24', '#a78bfa', '#34d399'];

	function statusDot(): string {
		if (error) return 'bg-red-500';
		if (!connected) return 'bg-zinc-500';
		return 'bg-emerald-500';
	}

	function fmtUs(us: number | null | undefined): string {
		if (us === null || us === undefined) return '—';
		if (us >= 1000) return `${(us / 1000).toFixed(1)}ms`;
		return `${Math.round(us)}μs`;
	}

	function lastUpdatedText(): string {
		if (!lastUpdated) return '';
		return new Date(lastUpdated).toTimeString().slice(0, 8);
	}
</script>

<svelte:head><title>gping – live latency</title></svelte:head>

<div class="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-200">
	<header class="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
		<h1 class="text-lg font-bold text-white">gping</h1>
		<div class="flex items-center gap-3 font-mono text-xs text-zinc-400">
			<span class="inline-flex items-center gap-2">
				<span class={`h-2 w-2 rounded-full ${statusDot()}`}></span>
				{error ? 'disconnected' : connected ? 'connected' : 'connecting'}
			</span>
			<span>api: {apiBase || 'same-origin'}</span>
			{#if lastUpdated}<span>updated {lastUpdatedText()}</span>{/if}
		</div>
	</header>

	{#if error && !snapshot}
		<div
			class="mx-auto max-w-5xl rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
		>
			<p class="font-semibold">Could not reach the gping HTTP server.</p>
			<p class="mt-1">
				Make sure it is running with <code class="rounded bg-zinc-900 px-1">--http</code>, e.g.
			</p>
			<pre
				class="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 font-mono text-xs">gping --http --http-address 0.0.0.0:8080 google.com cloudflare.com</pre>
			<p class="mt-2 text-xs opacity-80">Error: {error}</p>
		</div>
	{/if}

	<main class="mx-auto max-w-5xl space-y-6">
		{#if hosts.length === 0}
			{#if connected}
				<p class="text-center text-sm text-zinc-500">Waiting for data…</p>
			{/if}
		{:else}
			{#each hosts as host, i (host.display)}
				<section class="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
					<LatencyChart
						host={host.display}
						points={host.data}
						color={palette[i % palette.length]}
					/>
					<div
						class="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3 font-mono text-xs sm:grid-cols-8"
					>
						<div class="flex flex-col">
							<span class="text-zinc-500">last</span>
							<span class="text-zinc-200">{fmtUs(host.stats.last_us)}</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">min</span>
							<span class="text-zinc-200">{fmtUs(host.stats.min_us)}</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">avg</span>
							<span class="text-zinc-200">{fmtUs(host.stats.avg_us)}</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">max</span>
							<span class="text-zinc-200">{fmtUs(host.stats.max_us)}</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">jitter</span>
							<span class="text-zinc-200">{fmtUs(host.stats.jitter_us)}</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">p95</span>
							<span class="text-zinc-200">{fmtUs(host.stats.p95_us)}</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">timeouts</span>
							<span class={host.stats.timeouts ? 'text-red-400' : 'text-zinc-200'}>
								{host.stats.timeouts ?? '—'}
							</span>
						</div>
						<div class="flex flex-col">
							<span class="text-zinc-500">timeouts ({retentionLabel})</span>
							<span class={host.stats.timeouts_retention ? 'text-red-400' : 'text-zinc-200'}>
								{host.stats.timeouts_retention ?? '—'}
							</span>
						</div>
					</div>
				</section>
			{/each}
		{/if}
	</main>
</div>
