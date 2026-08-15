import { MarketDataGateway } from '../infrastructure/MarketDataGateway.js';
import { translateSymbol, shouldExcludeSymbol } from '../infrastructure/MarketSymbolLabels.js';

const HIGHLIGHTED = [
  { id: 'dollar', label: 'دلار', candidates: ['price_dollar_rl'] },
  { id: 'euro', label: 'یورو', candidates: ['price_eur'] },
  { id: 'pound', label: 'پوند', candidates: ['price_gbp'] },
  { id: 'aed', label: 'درهم', candidates: ['price_aed'] },

  { id: 'gold18', label: 'طلای ۱۸ عیار', candidates: ['geram18'] },
  { id: 'gold24', label: 'طلای ۲۴ عیار', candidates: ['geram24'] },
  { id: 'azadi', label: 'سکه بهار آزادی', candidates: ['sekeb'] },
  { id: 'emami', label: 'سکه امامی', candidates: ['sekee'] },

  { id: 'gold_fund_ayar', label: 'صندوق طلای عیار', candidates: ['ime_fund_ayar'] },
  { id: 'gold_fund_mesghal', label: 'صندوق طلای مثقال', candidates: ['ime_fund_mesghal'] },
  { id: 'gold_fund_lotus', label: 'صندوق طلای لوتوس', candidates: ['ime_fund_lotuss'] },
  { id: 'gold_fund_gohar', label: 'صندوق طلای گوهر', candidates: ['ime_fund_gohar'] },

  { id: 'bitcoin', label: 'بیت‌کوین', candidates: ['crypto-bitcoin-irr'] },
  { id: 'ethereum', label: 'اتریوم', candidates: ['crypto-ethereum-irr'] },
  { id: 'tether', label: 'تتر', candidates: ['crypto-tether-irr'] },
  { id: 'cardano', label: 'کاردانو', candidates: ['crypto-cardano-irr'] },
];

export class MarketPriceService {
  static HIGHLIGHTED_SYMBOLS = HIGHLIGHTED;

  static async getHighlighted() {
    const { map, fetchedAt } = await MarketDataGateway.getSnapshot();
    const items = HIGHLIGHTED.map((def) => {
      const found = def.candidates.map((c) => map.get(c)).find(Boolean);
      return {
        id: def.id,
        label: def.label,
        rial: found ? found.rial : null,
        available: Boolean(found),
      };
    });
    return { items, fetchedAt };
  }

  static async getAll() {
    const { map, fetchedAt } = await MarketDataGateway.getSnapshot();
    const items = [...map.values()]
      .filter((v) => !shouldExcludeSymbol(v.key))
      .map((v) => ({ key: v.key, rial: v.rial, ...translateSymbol(v.key) }))
      .filter((v) => v.translated)
      .map((v) => ({ id: v.key, label: v.label, rial: v.rial }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fa'));
    return { items, fetchedAt };
  }

  static rialToToman(rial) {
    return rial == null ? null : Math.round(rial / 10);
  }
}