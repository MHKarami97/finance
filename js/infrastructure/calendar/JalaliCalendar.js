/**
 * Infrastructure: JalaliCalendar (Adapter Pattern)
 * Converts between Gregorian and Jalali (Persian/Shamsi) calendars.
 * Algorithm ported and verified against the MIT-licensed reference implementation
 * "jalaali-js" by Behrang Noruzi Niya, based on Kazimierz Borkowski's astronomical model.
 * Reference: https://github.com/jalaali/jalaali-js (MIT License)
 */
export class JalaliCalendar {
  static #breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
  ];

  static #div(a, b) { return ~~(a / b); }
  static #mod(a, b) { return a - ~~(a / b) * b; }

  static #jalCal(jy, withoutLeap = false) {
    const div = JalaliCalendar.#div;
    const mod = JalaliCalendar.#mod;
    const breaks = JalaliCalendar.#breaks;
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = breaks[0];
    let jm, jump, n;

    if (jy < jp || jy >= breaks[bl - 1]) {
      throw new Error(`Invalid Jalaali year ${jy}`);
    }
    for (let i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (withoutLeap) return { gy, march };

    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march };
  }

  static #g2d(gy, gm, gd) {
    const div = JalaliCalendar.#div;
    const mod = JalaliCalendar.#mod;
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
      + div(153 * mod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  static #d2g(jdn) {
    const div = JalaliCalendar.#div;
    const mod = JalaliCalendar.#mod;
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy, gm, gd };
  }

  static #j2d(jy, jm, jd) {
    const r = JalaliCalendar.#jalCal(jy, true);
    return JalaliCalendar.#g2d(r.gy, 3, r.march) + (jm - 1) * 31 - JalaliCalendar.#div(jm, 7) * (jm - 7) + jd - 1;
  }

  static #d2j(jdn) {
    const div = JalaliCalendar.#div;
    const mod = JalaliCalendar.#mod;
    const gy = JalaliCalendar.#d2g(jdn).gy;
    let jy = gy - 621;
    const r = JalaliCalendar.#jalCal(jy, false);
    const jdn1f = JalaliCalendar.#g2d(gy, 3, r.march);
    let jd, jm, k;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy, jm, jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy, jm, jd };
  }

  /** Converts a Gregorian Date (or y,m,d) to { jy, jm, jd }. */
  static toJalali(dateOrYear, gm, gd) {
    if (dateOrYear instanceof Date) {
      return JalaliCalendar.#d2j(JalaliCalendar.#g2d(
        dateOrYear.getFullYear(), dateOrYear.getMonth() + 1, dateOrYear.getDate(),
      ));
    }
    return JalaliCalendar.#d2j(JalaliCalendar.#g2d(dateOrYear, gm, gd));
  }

  /** Converts Jalali { jy, jm, jd } to a native Gregorian Date object. */
  static toGregorian(jy, jm, jd) {
    const { gy, gm, gd } = JalaliCalendar.#d2g(JalaliCalendar.#j2d(jy, jm, jd));
    return new Date(gy, gm - 1, gd);
  }

  static isLeapYear(jy) {
    return JalaliCalendar.#jalCal(jy).leap === 0;
  }

  static daysInMonth(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return JalaliCalendar.isLeapYear(jy) ? 30 : 29;
  }

  static monthNames() {
    return ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
      'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  }

  static weekDayNames() {
    return ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  }

  static formatISOToJalali(isoDate) {
    const d = new Date(isoDate);
    const { jy, jm, jd } = JalaliCalendar.toJalali(d);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  }

  static formatFull(isoDate) {
    const d = new Date(isoDate);
    const { jy, jm, jd } = JalaliCalendar.toJalali(d);
    const weekDay = JalaliCalendar.weekDayNames()[(d.getDay() + 1) % 7];
    return `${weekDay} ${jd} ${JalaliCalendar.monthNames()[jm - 1]} ${jy}`;
  }

  static nowJalali() {
    return JalaliCalendar.toJalali(new Date());
  }
}
