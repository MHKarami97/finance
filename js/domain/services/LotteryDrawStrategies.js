/**
 * Domain Service: SecureRandom
 * Unbiased random integers backed by the Web Crypto API (rejection sampling
 * avoids modulo bias), which matters for a draw people consider "fair".
 */
export class SecureRandom {
  static int(maxExclusive) {
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    const buffer = new Uint32Array(1);
    let value;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % maxExclusive;
  }

  /** Fisher–Yates shuffle, returns a new array. */
  static shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = SecureRandom.int(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * Strategy interface. A "unit" is one winner unit of a month: either a single
 * full entry [{ personId, portion: 1 }] or a pair of half entries of two
 * different people. Every strategy returns
 * { assignments: Entry[][], conflicts: number } where assignments[m] holds the
 * entries of month m + 1 (W units per month). When the pool has an organizer,
 * the first unit (month 1) always belongs to the organizer.
 */
export class LotteryDrawStrategy {
  draw(_pool) {
    throw new Error('Not implemented');
  }

  static fullUnits(participants) {
    return participants.flatMap((p) => (
      Array.from({ length: Math.floor(p.shares) }, () => [{ personId: p.personId, portion: 1 }])
    ));
  }

  static halfEntries(participants) {
    return participants
      .filter((p) => !Number.isInteger(p.shares))
      .map((p) => ({ personId: p.personId, portion: 0.5 }));
  }

  /** Randomly pairs the half entries (all belong to different people). */
  static randomPairs(halves) {
    const shuffled = SecureRandom.shuffle(halves);
    const pairs = [];
    for (let i = 0; i + 1 < shuffled.length; i += 2) pairs.push([shuffled[i], shuffled[i + 1]]);
    return pairs;
  }

  /**
   * Moves one of the organizer's units to the front (position 0 = month 1).
   * A full unit is preferred; an organizer who only holds a half share gets his half pair.
   * Returns the locked unit, or null when there is no organizer.
   */
  static lockOrganizerFirst(units, organizerId) {
    if (!organizerId) return null;
    let index = units.findIndex((u) => u.length === 1 && u[0].personId === organizerId);
    if (index < 0) index = units.findIndex((u) => u.some((e) => e.personId === organizerId));
    if (index < 0) return null;
    [units[0], units[index]] = [units[index], units[0]];
    return units[0];
  }

  /** Groups units into months of `size` units and flattens each month into its entries. */
  static toMonths(units, size) {
    const months = [];
    for (let i = 0; i < units.length; i += size) months.push(units.slice(i, i + size).flat());
    return months;
  }
}

/** A person's units are drawn back-to-back; only the order of people is random (organizer first). */
export class ConsecutiveDrawStrategy extends LotteryDrawStrategy {
  draw(pool) {
    const organizer = pool.participants.find((p) => p.personId === pool.organizerId);
    const others = SecureRandom.shuffle(pool.participants.filter((p) => p !== organizer));
    const order = organizer ? [organizer, ...others] : others;

    const units = [];
    let pendingHalf = null;
    for (const p of order) {
      if (!Number.isInteger(p.shares)) {
        const half = { personId: p.personId, portion: 0.5 };
        if (pendingHalf) {
          units.push([pendingHalf, half]);
          pendingHalf = null;
        } else {
          pendingHalf = half;
        }
      }
      for (let i = 0; i < Math.floor(p.shares); i += 1) units.push([{ personId: p.personId, portion: 1 }]);
    }

    LotteryDrawStrategy.lockOrganizerFirst(units, pool.organizerId);
    return { assignments: LotteryDrawStrategy.toMonths(units, pool.winnersPerMonth), conflicts: 0 };
  }
}

/**
 * Random order where the same person should not win in the same or in
 * adjacent months. Randomized hill-climb over two moves: swap two units, or
 * swap a half entry between two half pairs; a move is kept if conflicts do not
 * increase. The organizer's locked unit never moves. Best effort: the remaining
 * conflict count is returned so the UI can tell the user when the constraint
 * is unsatisfiable.
 */
export class SpreadDrawStrategy extends LotteryDrawStrategy {
  static #MAX_ITERATIONS = 5000;

  draw(pool) {
    const size = pool.winnersPerMonth;
    const pairs = LotteryDrawStrategy.randomPairs(LotteryDrawStrategy.halfEntries(pool.participants));
    const units = SecureRandom.shuffle([...LotteryDrawStrategy.fullUnits(pool.participants), ...pairs]);
    const locked = LotteryDrawStrategy.lockOrganizerFirst(units, pool.organizerId);
    const firstMovable = locked ? 1 : 0;
    const movablePairs = pairs.filter((pair) => pair !== locked);
    const evaluate = () => SpreadDrawStrategy.countConflicts(LotteryDrawStrategy.toMonths(units, size));

    let conflicts = evaluate();
    for (let i = 0; i < SpreadDrawStrategy.#MAX_ITERATIONS && conflicts > 0; i += 1) {
      const swapHalves = movablePairs.length > 1 && SecureRandom.int(10) < 3;
      let undo;

      if (swapHalves) {
        const a = movablePairs[SecureRandom.int(movablePairs.length)];
        const b = movablePairs[SecureRandom.int(movablePairs.length)];
        if (a === b) continue;
        const ia = SecureRandom.int(2);
        const ib = SecureRandom.int(2);
        [a[ia], b[ib]] = [b[ib], a[ia]];
        undo = () => { [a[ia], b[ib]] = [b[ib], a[ia]]; };
      } else {
        const movable = units.length - firstMovable;
        if (movable < 2) break;
        const a = firstMovable + SecureRandom.int(movable);
        const b = firstMovable + SecureRandom.int(movable);
        if (a === b) continue;
        [units[a], units[b]] = [units[b], units[a]];
        undo = () => { [units[a], units[b]] = [units[b], units[a]]; };
      }

      const next = evaluate();
      if (next <= conflicts) conflicts = next;
      else undo();
    }
    return { assignments: LotteryDrawStrategy.toMonths(units, size), conflicts };
  }

  static countConflicts(months) {
    let conflicts = 0;
    months.forEach((entries, index) => {
      const inMonth = new Set();
      entries.forEach(({ personId }) => {
        if (inMonth.has(personId)) conflicts += 1;
        inMonth.add(personId);
      });
      if (index === 0) return;
      const previous = new Set(months[index - 1].map((e) => e.personId));
      inMonth.forEach((personId) => {
        if (previous.has(personId)) conflicts += 1;
      });
    });
    return conflicts;
  }
}

/** Factory: picks the strategy from the pool's "consecutive winner" option. */
export class LotteryDrawStrategyFactory {
  static forPool(pool) {
    return pool.keepWinnerConsecutive ? new ConsecutiveDrawStrategy() : new SpreadDrawStrategy();
  }
}
