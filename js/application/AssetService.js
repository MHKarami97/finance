import { Asset } from '../domain/entities/Asset.js';
import { MarketDataGateway } from '../infrastructure/MarketDataGateway.js';

export const ASSET_OPTIONS = {
  gold: {
    label: 'طلا',
    unit: 'گرم',
    karats: [
      { value: '18', label: 'طلای ۱۸ عیار', candidates: ['geram18'] },
      { value: '24', label: 'طلای ۲۴ عیار', candidates: ['geram24'] },
    ],
  },
  coin: {
    label: 'سکه',
    unit: 'عدد',
    types: [
      { value: 'azadi', label: 'سکه بهار آزادی (تمام)', candidates: ['sekeb'] },
      { value: 'emami', label: 'سکه امامی (تمام)', candidates: ['sekee'] },
      { value: 'half', label: 'نیم سکه', candidates: ['nim'] },
      { value: 'quarter', label: 'ربع سکه', candidates: ['rob'] },
      { value: 'gerami', label: 'سکه گرمی', candidates: ['gerami'] },
    ],
  },
  currency: {
    label: 'ارز',
    unit: 'واحد',
    types: [
      { value: 'usd', label: 'دلار آمریکا', candidates: ['price_dollar_rl'] },
      { value: 'eur', label: 'یورو', candidates: ['price_eur'] },
      { value: 'gbp', label: 'پوند انگلیس', candidates: ['price_gbp'] },
      { value: 'aed', label: 'درهم امارات', candidates: ['price_aed'] },
      { value: 'try', label: 'لیر ترکیه', candidates: ['price_try'] },
      { value: 'cad', label: 'دلار کانادا', candidates: ['price_cad'] },
      { value: 'aud', label: 'دلار استرالیا', candidates: ['price_aud'] },
      { value: 'chf', label: 'فرانک سوئیس', candidates: ['price_chf'] },
      { value: 'jpy', label: 'ین ژاپن', candidates: ['price_jpy'] },
      { value: 'cny', label: 'یوان چین', candidates: ['price_cny'] },
      { value: 'rub', label: 'روبل روسیه', candidates: ['price_rub'] },
      { value: 'inr', label: 'روپیه هند', candidates: ['price_inr'] },
      { value: 'iqd', label: 'دینار عراق', candidates: ['price_iqd'] },
      { value: 'kwd', label: 'دینار کویت', candidates: ['price_kwd'] },
      { value: 'sar', label: 'ریال عربستان', candidates: ['price_sar'] },
      { value: 'qar', label: 'ریال قطر', candidates: ['price_qar'] },
      { value: 'omr', label: 'ریال عمان', candidates: ['price_omr'] },
      { value: 'azn', label: 'مانات آذربایجان', candidates: ['price_azn'] },
      { value: 'amd', label: 'درام ارمنستان', candidates: ['price_amd'] },
      { value: 'afn', label: 'افغانی افغانستان', candidates: ['price_afn'] },
    ],
  },
  crypto: {
    label: 'ارز دیجیتال',
    unit: 'واحد',
    types: [
      { value: 'btc', label: 'بیت‌کوین', candidates: ['crypto-bitcoin-irr'] },
      { value: 'eth', label: 'اتریوم', candidates: ['crypto-ethereum-irr'] },
      { value: 'usdt', label: 'تتر', candidates: ['crypto-tether-irr'] },
      { value: 'ada', label: 'کاردانو', candidates: ['crypto-cardano-irr'] },
      { value: 'xrp', label: 'ریپل', candidates: ['crypto-ripple-irr'] },
      { value: 'bnb', label: 'بایننس کوین', candidates: ['crypto-binance-coin-irr'] },
      { value: 'doge', label: 'دوج‌کوین', candidates: ['crypto-dogecoin-irr'] },
      { value: 'sol', label: 'سولانا', candidates: ['crypto-solana-irr'] },
      { value: 'trx', label: 'ترون', candidates: ['crypto-tron-irr'] },
      { value: 'dot', label: 'پولکادات', candidates: ['crypto-polkadot-irr'] },
      { value: 'ltc', label: 'لایت‌کوین', candidates: ['crypto-litecoin-irr'] },
      { value: 'bch', label: 'بیت‌کوین کش', candidates: ['crypto-bitcoin-cash-irr'] },
      { value: 'link', label: 'چین‌لینک', candidates: ['crypto-chainlink-irr'] },
      { value: 'xlm', label: 'استلار', candidates: ['crypto-stellar-irr'] },
      { value: 'xmr', label: 'مونرو', candidates: ['crypto-monero-irr'] },
      { value: 'eos', label: 'ایاواس', candidates: ['crypto-eos-irr'] },
      { value: 'dash', label: 'دش', candidates: ['crypto-dash-irr'] },
      { value: 'ton', label: 'تون‌کوین', candidates: ['crypto-toncoin-irr'] },
      { value: 'shib', label: 'شیبا اینو', candidates: ['crypto-shiba-inu-irr'] },
      { value: 'usdc', label: 'یو‌اس‌دی کوین', candidates: ['crypto-usd-coin-irr'] },
      { value: 'avax', label: 'اولنچ', candidates: ['crypto-avalanche-irr'] },
    ],
  },
  gold_fund: {
    label: 'صندوق طلا',
    unit: 'واحد',
    types: [
      { value: 'ayar', label: 'صندوق طلای عیار', candidates: ['ime_fund_ayar'] },
      { value: 'mesghal', label: 'صندوق طلای مثقال', candidates: ['ime_fund_mesghal'] },
      { value: 'lotus', label: 'صندوق طلای لوتوس', candidates: ['ime_fund_lotuss'] },
      { value: 'gohar', label: 'صندوق طلای گوهر', candidates: ['ime_fund_gohar'] },
      { value: 'zar', label: 'صندوق طلای زر', candidates: ['ime_fund_zar'] },
      { value: 'zarvan', label: 'صندوق طلای زرافشان', candidates: ['ime_fund_zarvan'] },
      { value: 'tabesh', label: 'صندوق طلای تابش', candidates: ['ime_fund_tabesh'] },
      { value: 'javaher', label: 'صندوق طلای جواهر', candidates: ['ime_fund_javaher'] },
      { value: 'ganj', label: 'صندوق طلای گنج', candidates: ['ime_fund_ganj'] },
      { value: 'atash', label: 'صندوق طلای آتش', candidates: ['ime_fund_atash'] },
      { value: 'alton', label: 'صندوق طلای آلتون', candidates: ['ime_fund_alton'] },
      { value: 'derakhshan', label: 'صندوق طلای درخشان', candidates: ['ime_fund_derakhshan'] },
      { value: 'hamiyan', label: 'صندوق طلای همیان', candidates: ['ime_fund_hamiyan'] },
      { value: 'goldis', label: 'صندوق طلای گلدیس', candidates: ['ime_fund_goldis'] },
      { value: 'naab', label: 'صندوق طلای ناب', candidates: ['ime_fund_naab'] },
    ],
  },
  metal: {
    label: 'فلزات دیگر (نقره و ...)',
    unit: 'گرم/انس',
    types: [
      { value: 'silver_gram', label: 'نقره خالص (هر گرم)', candidates: ['silver_999'] },
      { value: 'silver_oz', label: 'انس جهانی نقره', candidates: ['silver'], usdBased: true },
      { value: 'gold_oz', label: 'انس جهانی طلا', candidates: ['ons'], usdBased: true },
    ],
  },
  stock: { label: 'سهام بورس', unit: 'سهم', manual: true },
  real_estate: { label: 'مسکن', unit: 'متر مربع', manual: true },
  car: { label: 'خودرو', unit: 'دستگاه', manual: true },
};

export class AssetService {
  #repo;

  constructor(assetRepo) {
    this.#repo = assetRepo;
  }

  create(dto) {
    const asset = new Asset(dto);
    this.#repo.add(asset);
    return asset;
  }

  update(id, dto) {
    const asset = new Asset({ id, ...dto });
    this.#repo.update(asset);
    return asset;
  }

  remove(id) {
    this.#repo.remove(id);
  }

  listAll() {
    return this.#repo.getAll();
  }

  async computeValuations() {
    const assets = this.listAll();
    let map = new Map();
    try {
      const snapshot = await MarketDataGateway.getSnapshot();
      map = snapshot.map;
    } catch (_) { /* fall back to manual pricing below */ }

    return assets.map((asset) => ({ asset, ...AssetService.#valuate(asset, map) }));
  }

  static #resolveRial(map, candidates = []) {
    for (const key of candidates) {
      const entry = map.get(key);
      if (entry) return entry.rial;
    }
    return null;
  }

  static #resolveDef(map, def) {
    if (!def) return null;
    const raw = AssetService.#resolveRial(map, def.candidates);
    if (raw == null) return null;
    if (!def.usdBased) return raw;
    const usdRial = AssetService.#resolveRial(map, ['price_dollar_rl']);
    if (usdRial == null) return null;
    return raw * usdRial;
  }

  /** Market-only valuation: no manual fallback (gold, coin, currency, crypto, gold_fund). */
  static #fromMarket(asset, map, list) {
    const def = list.find((t) => t.value === asset.symbolKey);
    const rial = AssetService.#resolveDef(map, def);
    if (rial == null) return { tomanValue: null, isManual: false, unavailable: true };
    return { tomanValue: Math.round((rial / 10) * asset.quantity), isManual: false, unavailable: false };
  }

  /** Market with manual fallback if the symbol isn't in the API (metal). */
  static #fromMarketOrManual(asset, map, list) {
    const def = list.find((t) => t.value === asset.symbolKey);
    const rial = AssetService.#resolveDef(map, def);
    if (rial == null) {
      const value = asset.manualPrice ? asset.manualPrice * asset.quantity : null;
      return { tomanValue: value, isManual: true, unavailable: !value };
    }
    return { tomanValue: Math.round((rial / 10) * asset.quantity), isManual: false, unavailable: false };
  }

  static #valuate(asset, map) {
    switch (asset.category) {
      case 'gold': return AssetService.#fromMarket(asset, map, ASSET_OPTIONS.gold.karats);
      case 'coin': return AssetService.#fromMarket(asset, map, ASSET_OPTIONS.coin.types);
      case 'currency': return AssetService.#fromMarket(asset, map, ASSET_OPTIONS.currency.types);
      case 'crypto': return AssetService.#fromMarket(asset, map, ASSET_OPTIONS.crypto.types);
      case 'gold_fund': return AssetService.#fromMarket(asset, map, ASSET_OPTIONS.gold_fund.types);
      case 'metal': return AssetService.#fromMarketOrManual(asset, map, ASSET_OPTIONS.metal.types);
      case 'stock': {
        const value = asset.manualPrice ? asset.manualPrice * asset.quantity : null;
        return { tomanValue: value, isManual: true, unavailable: !value };
      }
      case 'real_estate': {
        const value = (asset.area || 0) * (asset.pricePerSqm || 0);
        return { tomanValue: value || null, isManual: true, unavailable: !value };
      }
      case 'car': {
        return { tomanValue: asset.manualPrice || null, isManual: true, unavailable: !asset.manualPrice };
      }
      default:
        return { tomanValue: null, isManual: true, unavailable: true };
    }
  }
}