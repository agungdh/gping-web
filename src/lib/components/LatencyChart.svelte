<script lang="ts">
	import type { PingPoint } from '$lib/types';

	interface Props {
		host: string;
		points: PingPoint[];
		color?: string;
		height?: number;
	}

	let { host, points, color = '#22d3ee', height = 200 }: Props = $props();

	const W = 960;
	const PAD_TOP = 8;
	const PAD_BOTTOM = 20;
	const PAD_LEFT = 52;
	const PAD_RIGHT = 12;

	interface Mapped {
		x: number;
		y: number | null;
		v: number | null;
	}

	let { minT, maxT, mapped, yTicks, plotH, linePath, areaPath, timeouts, hasLine } = $derived.by(
		() => {
			const ys: number[] = [];
			for (const p of points) if (p.latency_us !== null) ys.push(p.latency_us);

			let maxY = ys.length ? Math.max(...ys) : 1;
			let minY = ys.length ? Math.min(...ys) : 0;
			if (maxY === minY) maxY = minY + 1;
			const buffer = (maxY - minY) * 0.1;
			maxY += buffer;
			if (minY - buffer > 0) minY -= buffer;
			else minY = 0;

			let minT = Infinity;
			let maxT = -Infinity;
			for (const p of points) {
				if (p.t < minT) minT = p.t;
				if (p.t > maxT) maxT = p.t;
			}
			if (!isFinite(minT)) {
				minT = 0;
				maxT = 1;
			} else if (minT === maxT) {
				maxT = minT + 1;
			}

			const span = maxT - minT;
			const plotW = W - PAD_LEFT - PAD_RIGHT;
			const plotH = height - PAD_TOP - PAD_BOTTOM;
			const x = (t: number) => PAD_LEFT + ((t - minT) / span) * plotW;
			const y = (v: number) => PAD_TOP + (1 - (v - minY) / (maxY - minY)) * plotH;

			const mapped: Mapped[] = points.map((p) => {
				if (p.latency_us === null) return { x: x(p.t), y: null, v: null };
				return { x: x(p.t), y: y(p.latency_us), v: p.latency_us };
			});

			const yTicks = Array.from({ length: 5 }, (_, i) => {
				const v = minY + ((maxY - minY) * i) / 4;
				return { v, pos: y(v) };
			});

			let path = '';
			for (let i = 0; i < mapped.length; i++) {
				const pt = mapped[i];
				if (pt.y === null) continue;
				path += i === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`;
			}
			const base = PAD_TOP + plotH;
			let area = path;
			if (area !== '') {
				const lastValid = [...mapped].reverse().find((p) => p.y !== null);
				const firstValid = mapped.find((p) => p.y !== null);
				if (firstValid && lastValid) {
					area = `${path} L ${lastValid.x} ${base} L ${firstValid.x} ${base} Z`;
				}
			}

			return {
				minT,
				maxT,
				mapped,
				yTicks,
				plotH,
				linePath: path,
				areaPath: area,
				timeouts: mapped.filter((p) => p.v === null),
				hasLine: path !== ''
			};
		}
	);

	function fmtUs(us: number | null | undefined): string {
		if (us === null || us === undefined) return '—';
		if (us >= 1000) return `${(us / 1000).toFixed(1)}ms`;
		return `${Math.round(us)}μs`;
	}

	function fmtClock(t: number): string {
		const d = new Date(t * 1000);
		return d.toTimeString().slice(0, 8);
	}
</script>

<div class="w-full">
	<div class="mb-1 flex items-baseline justify-between">
		<h2 class="text-sm font-semibold text-zinc-200">{host}</h2>
		<span class="font-mono text-xs text-zinc-500">
			{mapped.filter((p) => p.v !== null).length} samples
		</span>
	</div>

	<svg
		viewBox="0 0 {W} {height}"
		class="w-full"
		role="img"
		aria-label="Latency over time for {host}"
	>
		{#each yTicks as tick (tick.v)}
			<line
				x1={PAD_LEFT}
				x2={W - PAD_RIGHT}
				y1={tick.pos}
				y2={tick.pos}
				stroke="#27272a"
				stroke-width="1"
			/>
			<text
				x={PAD_LEFT - 6}
				y={tick.pos + 3}
				text-anchor="end"
				class="fill-zinc-500"
				font-size="10"
			>
				{fmtUs(tick.v)}
			</text>
		{/each}

		{#if hasLine}
			<path d={areaPath} fill={color} opacity="0.12" stroke="none" />
			<path
				d={linePath}
				fill="none"
				stroke={color}
				stroke-width="1.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			{#each timeouts as pt (pt.x)}
				<line
					x1={pt.x}
					x2={pt.x}
					y1={PAD_TOP}
					y2={PAD_TOP + plotH}
					stroke="#dc2626"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}
		{:else}
			<text
				x={(PAD_LEFT + W - PAD_RIGHT) / 2}
				y={height / 2}
				text-anchor="middle"
				class="fill-zinc-600"
				font-size="12"
			>
				No data yet
			</text>
		{/if}

		<text x={PAD_LEFT} y={height - 6} class="fill-zinc-500" font-size="10">
			{fmtClock(minT)}
		</text>
		<text x={W - PAD_RIGHT} y={height - 6} text-anchor="end" class="fill-zinc-500" font-size="10">
			{fmtClock(maxT)}
		</text>
	</svg>
</div>
