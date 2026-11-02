export interface TickLoopOptions {
  tickMs: number;
  onTick: (tick: number) => void;
  onLag?: (lagMs: number) => void;
}

export interface TickLoop {
  start(): void;
  stop(): void;
  readonly tickCount: number;
}

// Itne tick peeche reh gaye to catch-up nahi, skip karenge
const MAX_LAG_TICKS = 5;

export function createTickLoop(opts: TickLoopOptions): TickLoop {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextAt = 0;
  let tick = 0;
  let running = false;

  function schedule(): void {
    const delay = Math.max(0, nextAt - performance.now());
    timer = setTimeout(run, delay);
  }

  function run(): void {
    if (!running) return;

    const lagMs = performance.now() - nextAt;
    if (lagMs > opts.tickMs * MAX_LAG_TICKS) {
      opts.onLag?.(lagMs);
      nextAt = performance.now(); // schedule reset, peeche ke ticks skip
    }

    tick++;
    try {
      opts.onTick(tick);
    } catch (err) {
      // Ek tick fail hone se poora loop band nahi hona chahiye
      console.error(`Tick ${tick} failed:`, err);
    }

    nextAt += opts.tickMs;
    schedule();
  }

  return {
    start() {
      if (running) return;
      running = true;
      nextAt = performance.now() + opts.tickMs;
      schedule();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    get tickCount() {
      return tick;
    },
  };
}