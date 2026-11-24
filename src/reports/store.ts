/** Reports on the map: the pilot's own and the ones received from others. */
import type { ReportKind } from "./catalog";

export interface Report {
  id: string;
  kind: ReportKind;
  variant: number;
  x: number;
  y: number;
  /** Pseudonym of the reporting pilot, or null for the pilot using the app. */
  author: string | null;
  minutesAgo: number;
  /** An alert has already been shown for this report during the current flight. */
  alerted: boolean;
  votes: number;
}

/** Distance (m) under which a report ahead of the pilot raises an alert. */
export const ALERT_RADIUS_M = 900;

export class ReportStore {
  private seq = 0;

  constructor(public items: Report[] = []) {}

  /** Add a report made by the pilot at a position. */
  add(kind: ReportKind, variant: number, x: number, y: number): Report {
    const report: Report = {
      id: `mine-${++this.seq}`,
      kind,
      variant,
      x,
      y,
      author: null,
      minutesAgo: 0,
      alerted: true,
      votes: 0,
    };
    this.items.push(report);
    return report;
  }

  /** New flight: every report from others can alert again. */
  rearm(): void {
    for (const r of this.items) r.alerted = r.author === null;
  }

  /**
   * First report from another pilot closer than `radius` and not behind the pilot
   * (along `bearing`, radians clockwise from north). It is marked as alerted.
   */
  nextAlert(x: number, y: number, bearing: number, radius = ALERT_RADIUS_M): Report | null {
    for (const r of this.items) {
      if (r.alerted || r.author === null) continue;
      const dx = r.x - x;
      const dy = r.y - y;
      const ahead = dx * Math.sin(bearing) + dy * Math.cos(bearing);
      if (Math.hypot(dx, dy) < radius && ahead > -100) {
        r.alerted = true;
        return r;
      }
    }
    return null;
  }

  vote(report: Report, stillThere: boolean): void {
    report.votes += stillThere ? 1 : -1;
  }
}
