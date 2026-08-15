/**
 * Infrastructure: MarketSymbolLabels
 * Translates raw TGJU field keys into Persian labels. Only keys matched by
 * EXACT_LABELS or a PATTERN_RULES entry are considered "translated"; anything
 * else is reported as untranslated so callers (e.g. the "نمایش بیشتر" list)
 * can filter it out instead of showing a raw/half-cleaned key.
 */

const CURRENCY_NAMES = {
  usd: 'دلار آمریکا', eur: 'یورو', gbp: 'پوند انگلیس', aed: 'درهم امارات',
  try: 'لیر ترکیه', jpy: 'ین ژاپن', cny: 'یوان چین', cad: 'دلار کانادا',
  aud: 'دلار استرالیا', chf: 'فرانک سوئیس', sek: 'کرون سوئد', nok: 'کرون نروژ',
  dkk: 'کرون دانمارک', rub: 'روبل روسیه', inr: 'روپیه هند', pkr: 'روپیه پاکستان',
  afn: 'افغانی افغانستان', iqd: 'دینار عراق', kwd: 'دینار کویت', sar: 'ریال عربستان',
  qar: 'ریال قطر', omr: 'ریال عمان', bhd: 'دینار بحرین', jod: 'دینار اردن',
  egp: 'پوند مصر', syp: 'لیر سوریه', lbp: 'لیر لبنان', yer: 'ریال یمن',
  azn: 'مانات آذربایجان', amd: 'درام ارمنستان', gel: 'لاری گرجستان',
  kzt: 'تنگه قزاقستان', uzs: 'سوم ازبکستان', tjs: 'سامانی تاجیکستان',
  krw: 'وون کره جنوبی', hkd: 'دلار هنگ‌کنگ', sgd: 'دلار سنگاپور', myr: 'رینگیت مالزی',
  thb: 'بات تایلند', idr: 'روپیه اندونزی', php: 'پزوی فیلیپین', vnd: 'دنگ ویتنام',
  twd: 'دلار تایوان', nzd: 'دلار نیوزیلند', zar: 'رند آفریقای‌جنوبی', ngn: 'نایرای نیجریه',
  kes: 'شیلینگ کنیا', ghs: 'سدی غنا', mad: 'درهم مراکش', dzd: 'دینار الجزایر',
  tnd: 'دینار تونس', lyd: 'دینار لیبی', brl: 'رئال برزیل', mxn: 'پزوی مکزیک',
  ars: 'پزوی آرژانتین', clp: 'پزوی شیلی', cop: 'پزوی کلمبیا', pen: 'سول پرو',
  pln: 'زلوتی لهستان', czk: 'کرون چک', huf: 'فورینت مجارستان', ron: 'لئوی رومانی',
  bgn: 'لوی بلغارستان', hrk: 'کرون کرواسی', isk: 'کرون ایسلند', uah: 'گریونای اوکراین',
  byn: 'روبل بلاروس', rsd: 'دینار صربستان', mdl: 'لئوی مولداوی', all: 'لک آلبانی',
  ang: 'گیلدر آنتیل هلند', awg: 'فلورین آروبا', bam: 'مارک بوسنی', bdt: 'تاکای بنگلادش',
  bif: 'فرانک بوروندی', bmd: 'دلار برمودا', bnd: 'دلار برونئی', bsd: 'دلار باهاما',
  btn: 'نگولترم بوتان', bwp: 'پولای بوتسوانا', bzd: 'دلار بلیز', cdf: 'فرانک کنگو',
  crc: 'کولون کاستاریکا', cup: 'پزوی کوبا', cve: 'اسکودو کیپ‌ورد', djf: 'فرانک جیبوتی',
  dop: 'پزوی دومینیکن', etb: 'بیر اتیوپی', fjd: 'دلار فیجی', gmd: 'دالاسی گامبیا',
  gtq: 'کتزال گواتمالا', gyd: 'دلار گویان', hnl: 'لمپیرای هندوراس', htg: 'گورد هائیتی',
  jmd: 'دلار جامائیکا', kgs: 'سام قرقیزستان', khr: 'ریل کامبوج', kmf: 'فرانک کومور',
  kyd: 'دلار کیمن', lak: 'کیپ لائوس', lkr: 'روپیه سریلانکا', lrd: 'دلار لیبریا',
  lsl: 'لوتی لسوتو', mga: 'آریاری ماداگاسکار', mkd: 'دینار مقدونیه', mmk: 'کیات میانمار',
  mnt: 'توگروگ مغولستان', mop: 'پاتاکای ماکائو', mro: 'اوگویای موریتانی', mur: 'روپیه موریس',
  mvr: 'روفیای مالدیو', mwk: 'کواچای مالاوی', mzn: 'متیکال موزامبیک', nad: 'دلار نامیبیا',
  nio: 'کوردوبای نیکاراگوئه', npr: 'روپیه نپال', pab: 'بالبوآی پاناما', pgk: 'کینای پاپوا',
  pyg: 'گوارانی پاراگوئه', rwf: 'فرانک رواندا', scr: 'روپیه سیشل', sll: 'لئونی سیرالئون',
  sos: 'شیلینگ سومالی', std: 'دوبرای سائوتومه', svc: 'کولون السالوادور', szl: 'لیلانگنی سواتینی',
  tmt: 'مانات ترکمنستان', ttd: 'دلار ترینیداد', tzs: 'شیلینگ تانزانیا', ugx: 'شیلینگ اوگاندا',
  uyu: 'پزوی اروگوئه', vuv: 'واتوی وانواتو', xaf: 'فرانک آفریقای مرکزی', xcd: 'دلار کارائیب شرقی',
  xof: 'فرانک آفریقای غربی', xpf: 'فرانک پلی‌نزی', zmw: 'کواچای زامبیا', ils: 'شکل اسرائیل',
};

const CRYPTO_NAMES = {
  bitcoin: 'بیت‌کوین', ethereum: 'اتریوم', tether: 'تتر', 'usd-coin': 'یو‌اس‌دی کوین',
  ripple: 'ریپل', 'binance-coin': 'بایننس کوین', cardano: 'کاردانو', dogecoin: 'دوج‌کوین',
  solana: 'سولانا', polkadot: 'پولکادات', tron: 'ترون', litecoin: 'لایت‌کوین',
  'bitcoin-cash': 'بیت‌کوین کش', chainlink: 'چین‌لینک', stellar: 'استلار',
  monero: 'مونرو', eos: 'ایاواس', dash: 'دش', zcash: 'زی‌کش', neo: 'نئو',
  nem: 'نم', maker: 'میکر', decred: 'دیکرد', avalanche: 'اولنچ', tezos: 'تزوس',
  waves: 'ویوز', filecoin: 'فایل‌کوین', fantom: 'فانتوم', flow: 'فلو', gala: 'گالا',
  elrond: 'مالتی‌ورس ایکس', cosmos: 'کازماس', 'loopring-irc': 'لوپ‌رینگ',
  bittorrent: 'بیت‌تورنت', 'shiba-inu': 'شیبا اینو', sandbox: 'سندباکس',
  toncoin: 'تون‌کوین', pancakeswap: 'پنکیک‌سواپ', uniswap: 'یونی‌سواپ',
  'ethereum-classic': 'اتریوم کلاسیک',
};

const IME_FUND_NAMES = {
  ayar: 'صندوق طلای عیار', mesghal: 'صندوق طلای مثقال', gohar: 'صندوق طلای گوهر',
  lotuss: 'صندوق طلای لوتوس', lotus: 'صندوق طلای لوتوس', zar: 'صندوق طلای زر',
  kahroba: 'صندوق طلای کهربا', zomorod: 'صندوق طلای زمرد', zarvan: 'صندوق طلای زرافشان',
  zargar: 'صندوق طلای زرگر', zarfam: 'صندوق طلای زرفام', tabesh: 'صندوق طلای تابش',
  simin: 'صندوق نقره سیمین', silver: 'صندوق نقره', safron: 'صندوق طلای زعفران',
  roztoranj: 'صندوق طلای روزترنج', rosgold: 'صندوق طلای رزگلد', rosegold: 'صندوق طلای رزگلد',
  riton: 'صندوق طلای ریتون', noghrin: 'صندوق نقره نقرین', noghran: 'صندوق نقره نقران',
  noghrabi: 'صندوق نقره نقره‌بی', neginfars: 'صندوق طلای نگین‌فارس', nahal: 'صندوق طلای نهال',
  nafis: 'صندوق طلای نفیس', naab: 'صندوق طلای ناب', miras: 'صندوق طلای میراث',
  liyan: 'صندوق طلای لیان', javaher: 'صندوق طلای جواهر', jaamtala: 'صندوق طلای جام‌طلا',
  hamiyan: 'صندوق طلای همیان', goldis: 'صندوق طلای گلدیس', golda: 'صندوق طلای گلدا',
  ghyrat: 'صندوق طلای قیراط', ganj: 'صندوق طلای گنج', emerald: 'صندوق طلای زمرد (Emerald)',
  dorna: 'صندوق طلای درنا', derakhshan: 'صندوق طلای درخشان', atash: 'صندوق طلای آتش',
  alton: 'صندوق طلای آلتون',
};

const EXACT_LABELS = {
  price_dollar_rl: 'دلار آزاد', geram18: 'طلای ۱۸ عیار', geram24: 'طلای ۲۴ عیار',
  geram18buy: 'طلای ۱۸ عیار (پیش‌گشایی)', geram24buy: 'طلای ۲۴ عیار (پیش‌گشایی)',
  sekeb: 'سکه بهار آزادی', sekee: 'سکه امامی', sekeb_buy: 'سکه بهار آزادی (پیش‌گشایی)',
  sekee_buy: 'سکه امامی (پیش‌گشایی)', sekeb_blubber: 'حباب سکه بهار آزادی',
  sekee_real: 'سکه امامی (بازار آزاد)', sekee_down: 'سکه امامی (پایین بازار)',
  sekee_dollar: 'ارزش دلاری سکه امامی', retail_sekee: 'سکه امامی (خرد فروشی)',
  retail_sekeb: 'سکه بهار آزادی (خرد فروشی)', retail_rob: 'ربع سکه (خرد فروشی)',
  retail_nim: 'نیم سکه (خرد فروشی)', retail_gerami: 'سکه گرمی (خرد فروشی)',
  nim: 'نیم سکه', nim_down: 'نیم سکه (پایین بازار)', nim_blubber: 'حباب نیم سکه',
  rob: 'ربع سکه', rob_down: 'ربع سکه (پایین بازار)', rob_blubber: 'حباب ربع سکه',
  gerami: 'سکه گرمی', gerami_blubber: 'حباب سکه گرمی',
  mesghal: 'مثقال طلا', ons: 'انس جهانی طلا', ons_buy: 'انس جهانی طلا (پیش‌گشایی)',
  silver: 'انس جهانی نقره', silver_999: 'نقره خالص ۹۹۹ (هر گرم)', silver_925: 'نقره استرلینگ ۹۲۵ (هر گرم)',
  platinum: 'پلاتین جهانی', palladium: 'پالادیوم جهانی',
  afghan_usd: 'دلار در بازار افغانستان', usd_afn_bid: 'نرخ برابری دلار به افغانی',
  'crypto-tether-irr': 'تتر', 'crypto-bitcoin-irr': 'بیت‌کوین', 'crypto-ethereum-irr': 'اتریوم',
  'crypto-cardano-irr': 'کاردانو',
  tether_gold_xaut: 'توکن طلای تتر (XAUt)',
  s_p_500_us: 'شاخص S&P 500', nasdaq_us: 'شاخص نزدک', dowjones_us: 'شاخص داوجونز',
  oil: 'نفت خام', oil_brent: 'نفت برنت', oil_opec: 'نفت اوپک',
  tgju_gold_irg18: 'شاخص طلای ۱۸ عیار تی‌جی‌جی‌یو', tgju_gold_irg18_buy: 'شاخص طلای ۱۸ عیار (پیش‌گشایی)',
  gold_melted_wholesale: 'آبشده بنکداری', gold_melted_transfer: 'آبشده تحویل',
  goldminisize: 'شمش طلای مینی‌سایز', gold_futures: 'آتی طلا',
  bourse: 'شاخص کل بورس تهران',
};

const PATTERN_RULES = [
  {
    test: (k) => /^crypto-([a-z0-9-]+?)(-irr)?$/.test(k),
    format: (k) => {
      const m = k.match(/^crypto-([a-z0-9-]+?)(-irr)?$/);
      const slug = m[1];
      const isIrr = Boolean(m[2]);
      const name = CRYPTO_NAMES[slug];
      if (!name) return null;
      return `${name}${isIrr ? ' (ریال)' : ' (دلار)'}`;
    },
  },
  {
    test: (k) => k.startsWith('price_'),
    format: (k) => {
      const code = k.replace('price_', '');
      const name = CURRENCY_NAMES[code];
      return name ? `نرخ ${name}` : null;
    },
  },
  {
    test: (k) => /^usd-([a-z]{3})-(ask|bid)$/.test(k),
    format: (k) => {
      const [, code, side] = k.match(/^usd-([a-z]{3})-(ask|bid)$/);
      const name = CURRENCY_NAMES[code];
      return name ? `دلار به ${name} (${side === 'ask' ? 'فروش' : 'خرید'})` : null;
    },
  },
  {
    test: (k) => k.startsWith('ime_fund_'),
    format: (k) => {
      const slug = k.replace('ime_fund_', '');
      return IME_FUND_NAMES[slug] || null;
    },
  },
];

/**
 * Keys we never want to surface in the "نمایش بیشتر" table, regardless of
 * whether a translation exists (cross-rate diffs, generic gc/general
 * indices, ICE currency cross tables, global base-metal tickers).
 */
const EXCLUDE_PATTERNS = [
  /^diff/i,
  /^gc\d+$/i,
  /^general\d+$/i,
  /^ice_?currency/i,
  /^base_?global/i,
];

export function shouldExcludeSymbol(key) {
  return EXCLUDE_PATTERNS.some((re) => re.test(key));
}

/**
 * Returns { label, translated }. `translated` is false when only a raw
 * key-cleanup fallback was possible — callers that only want confidently
 * translated items should filter on this flag.
 */
export function translateSymbol(key) {
  if (EXACT_LABELS[key]) return { label: EXACT_LABELS[key], translated: true };
  for (const rule of PATTERN_RULES) {
    if (rule.test(key)) {
      const label = rule.format(key);
      if (label) return { label, translated: true };
    }
  }
  const fallback = key.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { label: fallback, translated: false };
}

export function getPersianLabel(key) {
  return translateSymbol(key).label;
}