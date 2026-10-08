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
 * Strategy interface. Each strategy returns
 * { assignments: string[][], conflicts: number } where assignments[m] lists
 * the personIds who win in month m + 1.
 */
export class LotteryDrawStrategy {
  draw(_pool) {
    throw new Error('Not implemented');
  }

  static expandShares(participants) {
    return participants.flatMap((p) => Array(p.shares).fill(p.personId));
  }

  static chunk(sequence, size) {
    const months = [];
    for (let i = 0; i < sequence.length; i += size) months.push(sequence.slice(i, i + size));
    return months;
  }
}

/** A person's shares are drawn back-to-back; only the order of people is random. */
export class ConsecutiveDrawStrategy extends LotteryDrawStrategy {
  draw(pool) {
    const sequence = LotteryDrawStrategy.expandShares(SecureRandom.shuffle(pool.participants));
    return { assignments: LotteryDrawStrategy.chunk(sequence, pool.winnersPerMonth), conflicts: 0 };
  }
}

/**
 * Random order where the same person should not win in the same or in
 * adjacent months. Solved with a randomized hill-climb (swap two slots,
 * keep the swap if conflicts do not increase). Best effort: when a person
 * holds too many shares for the constraint to be satisfiable, the remaining
 * conflict count is returned so the UI can tell the user.
 */
export class SpreadDrawStrategy extends LotteryDrawStrategy {
  static #MAX_ITERATIONS = 5000;

  draw(pool) {
    const sequence = SecureRandom.shuffle(LotteryDrawStrategy.expandShares(pool.participants));
    const size = pool.winnersPerMonth;
    let conflicts = SpreadDrawStrategy.countConflicts(LotteryDrawStrategy.chunk(sequence, size));

    for (let i = 0; i < SpreadDrawStrategy.#MAX_ITERATIONS && conflicts > 0; i += 1) {
      const a = SecureRandom.int(sequence.length);
      const b = SecureRandom.int(sequence.length);
      if (sequence[a] === sequence[b]) continue;

      [sequence[a], sequence[b]] = [sequence[b], sequence[a]];
      const next = SpreadDrawStrategy.countConflicts(LotteryDrawStrategy.chunk(sequence, size));
      if (next <= conflicts) {
        conflicts = next;
      } else {
        [sequence[a], sequence[b]] = [sequence[b], sequence[a]];
      }
    }
    return { assignments: LotteryDrawStrategy.chunk(sequence, size), conflicts };
  }

  static countConflicts(months) {
    let conflicts = 0;
    months.forEach((winners, index) => {
      const inMonth = new Set();
      winners.forEach((id) => {
        if (inMonth.has(id)) conflicts += 1;
        inMonth.add(id);
      });
      if (index === 0) return;
      const previous = new Set(months[index - 1]);
      inMonth.forEach((id) => {
        if (previous.has(id)) conflicts += 1;
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
