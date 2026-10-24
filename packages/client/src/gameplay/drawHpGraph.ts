import type { HitRecord } from '@oss-idle/shared/sim/maniaGame';
import { MAX_HP } from '@oss-idle/shared/sim/scoring';

const GREEN = '126, 231, 135';
const RED = '255, 90, 114';

/** Vertical gradient that turns from green to red at `splitY`, sharply. */
function splitGradient(
	ctx: CanvasRenderingContext2D,
	top: number,
	bottom: number,
	splitY: number,
	alpha: number,
): CanvasGradient {
	const g = ctx.createLinearGradient(0, top, 0, bottom);
	const s = Math.max(0, Math.min(1, (splitY - top) / (bottom - top)));
	g.addColorStop(s, `rgba(${GREEN}, ${alpha})`);
	g.addColorStop(s, `rgba(${RED}, ${alpha})`);
	return g;
}

/** The x spans where the curve runs below `low`, each crossing interpolated. */
function lowSpans(points: { x: number, hp: number }[], low: number): [number, number][] {
	const spans: [number, number][] = [];
	let start: number | undefined;
	for (let i = 1; i < points.length; i++) {
		const a = points[i - 1];
		const b = points[i];
		const cross = a.x + (low - a.hp) / (b.hp - a.hp) * (b.x - a.x);
		if (start === undefined && b.hp < low) start = a.hp < low ? a.x : cross;
		else if (start !== undefined && b.hp >= low) {
			spans.push([start, cross]);
			start = undefined;
		}
	}
	if (start !== undefined) spans.push([start, points[points.length - 1].x]);
	return spans;
}

interface HpGraphOpts {
	hits: HitRecord[]
	songEndMs: number
	width: number
	height: number
	/** the live HP bar's low threshold, 0..1 */
	lowThreshold: number
}

/** HP over the course of the song: green, red below the live HP bar's low threshold. */
export function drawHpGraph(ctx: CanvasRenderingContext2D, opts: HpGraphOpts): void {
	const { hits, songEndMs, width, height, lowThreshold } = opts;
	const pad = 10;
	const top = pad;
	const bottom = height - pad;
	const left = pad;
	const right = width - pad;
	const progress = (t: number) => songEndMs > 0 ? Math.min(1, t / songEndMs) : 0;
	const xFor = (t: number) => left + progress(t) * (right - left);
	const yFor = (hp: number) => top + (1 - hp / MAX_HP) * (bottom - top);
	const lowY = yFor(lowThreshold * MAX_HP);
	const points: Pick<HitRecord, 'time' | 'hp'>[] = [{
		time: 0, hp: MAX_HP,
	}, ...hits];

	ctx.clearRect(0, 0, width, height);

	// quarter gridlines
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
	ctx.lineWidth = 1;
	ctx.setLineDash([3, 5]);
	ctx.beginPath();
	for (const q of [0.25, 0.5, 0.75]) {
		const y = Math.round(yFor(q * MAX_HP)) + 0.5;
		ctx.moveTo(left, y);
		ctx.lineTo(right, y);
	}
	ctx.stroke();
	ctx.setLineDash([]);

	const curve = points.map(p => ({
		x: xFor(p.time), hp: p.hp ?? MAX_HP,
	}));
	const line = new Path2D();
	for (const p of curve) line.lineTo(p.x, yFor(p.hp));
	const last = curve[curve.length - 1];
	const lastY = yFor(last.hp);

	// area under the curve, each column in its line's colour, then a soft
	// glow and the crisp line on top
	const area = new Path2D(line);
	area.lineTo(last.x, bottom);
	area.lineTo(left, bottom);
	area.closePath();
	const red = new Path2D();
	const green = new Path2D();
	green.rect(0, 0, width, height);
	for (const [x0, x1] of lowSpans(curve, lowThreshold * MAX_HP)) {
		red.rect(x0, 0, x1 - x0, height);
		green.rect(x0, 0, x1 - x0, height);
	}
	for (const [clip, rgb, rule] of [
		[green, GREEN, 'evenodd'],
		[red, RED, 'nonzero'],
	] as const) {
		const fade = ctx.createLinearGradient(0, top, 0, bottom);
		fade.addColorStop(0, `rgba(${rgb}, 0.3)`);
		fade.addColorStop(1, `rgba(${rgb}, 0.03)`);
		ctx.save();
		ctx.clip(clip, rule);
		ctx.fillStyle = fade;
		ctx.fill(area);
		ctx.restore();
	}

	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.lineWidth = 7;
	ctx.strokeStyle = splitGradient(ctx, top, bottom, lowY, 0.18);
	ctx.stroke(line);
	ctx.lineWidth = 2;
	ctx.strokeStyle = splitGradient(ctx, top, bottom, lowY, 1);
	ctx.stroke(line);

	ctx.fillStyle = `rgb(${lastY > lowY ? RED : GREEN})`;
	ctx.beginPath();
	ctx.arc(last.x, lastY, 3.5, 0, Math.PI * 2);
	ctx.fill();
}
