# مدیریت مالی من (Personal Finance Manager PWA)

اپلیکیشن وب پیشرو (Progressive Web App) برای مدیریت دخل و خرج شخصی، **بدون هیچ بک‌اند یا سرور**.
تمام داده‌های شما فقط در مرورگر خودتان (`localStorage`) ذخیره می‌شود.


ساخته‌شده توسط **محمدحسین کرمی** — [mhkarami97.ir](https://mhkarami97.ir)

---

## ✨ امکانات

- ثبت نامحدود تراکنش (درآمد / هزینه) با دسته‌بندی و کیف پول
- دسته‌بندی‌های پیش‌فرض + قابلیت افزودن کیف پول جدید
- **تقویم شمسی کامل و بومی** (بدون کتابخانه خارجی) برای انتخاب تاریخ تراکنش‌ها
- داشبورد با موجودی کل و خلاصه ماه جاری
- گزارش نموداری (Donut Chart با CSS خالص) هزینه‌ها به تفکیک دسته‌بندی، با ناوبری بین ماه‌های شمسی
- خروجی گرفتن از داده‌ها به‌صورت **CSV** (گزارش) و **JSON** (پشتیبان کامل) + بازیابی از فایل JSON
- **حالت تیره / روشن (Dark / Light Theme)** با سوییچ در تنظیمات و ذخیره خودکار ترجیح کاربر
- **PWA کامل**: قابل نصب روی موبایل و دسکتاپ، کار کاملاً آفلاین با Service Worker
- طراحی Mobile-First و ریسپانسیو با نویگیشن ثابت پایین صفحه (Bottom Navigation)
- صفحه «درباره ما» با معرفی اپلیکیشن و سازنده

---

## 🏗️ معماری پروژه (Clean Architecture)

پروژه با جاوااسکریپت خالص (ES Modules، بدون فریم‌ورک) و رعایت اصول **SOLID** و **Clean Architecture** نوشته شده:

```
js/
├── domain/                 # هسته دامنه - بدون هیچ وابستگی خارجی
│   ├── entities/           # Transaction, Category, Wallet, Budget
│   └── valueobjects/       # Money (Value Object غیرقابل تغییر)
│
├── application/            # لایه کاربرد - Use Caseها
│   ├── TransactionService.js
│   ├── BudgetService.js
│   └── ExportService.js    # Strategy Pattern برای خروجی CSV/JSON
│
├── infrastructure/         # جزئیات فنی - قابل تغییر بدون اثر روی دامنه
│   ├── StorageGateway.js   # انتزاع روی localStorage
│   ├── BaseRepository.js   # قرارداد Repository Pattern
│   ├── repositories/       # پیاده‌سازی مخزن هر Aggregate
│   ├── calendar/JalaliCalendar.js  # تبدیل شمسی/میلادی (الگوریتم jalaali-js)
│   ├── EventBus.js         # Observer Pattern برای ارتباط لایه‌ها
│   ├── Router.js           # SPA Router سبک بر پایه hash
│   └── ThemeManager.js     # مدیریت تم تیره/روشن
│
├── presentation/            # لایه نمایش
│   ├── components/          # BottomNav, TopBar, ShamsiDatePicker, ...
│   └── pages/                # Dashboard, Transactions, Add, Reports, Settings, About
│
└── main.js                  # Composition Root - Dependency Injection همه سرویس‌ها
```

### الگوهای طراحی استفاده‌شده
| الگو | محل استفاده | هدف |
|---|---|---|
| Repository Pattern | `infrastructure/repositories/*` | جداسازی منطق دامنه از جزئیات ذخیره‌سازی |
| Dependency Injection | `main.js` (Composition Root) | تزریق وابستگی‌ها به‌جای ساخت مستقیم |
| Value Object | `domain/valueobjects/Money.js` | جلوگیری از باگ‌های محاسباتی اعشار/float |
| Strategy Pattern | `ExportService` (CSV vs JSON) | امکان افزودن فرمت خروجی جدید بدون تغییر کد موجود |
| Observer Pattern | `EventBus.js` | ارتباط رویداد-محور بین لایه Application و Presentation |
| Adapter Pattern | `JalaliCalendar.js` | تطبیق الگوریتم تقویم شمسی با API داخلی پروژه |
| Factory Pattern | `BottomNav.render()`, `TopBar.render()` | تولید عناصر DOM بدون افشای جزئیات ساخت |

---

## 📅 تقویم شمسی

الگوریتم تبدیل شمسی/میلادی از کتابخانه معتبر و متن‌باز **jalaali-js** (مجوز MIT) پیاده‌سازی و در Node.js با چند تاریخ کنترلی (مثل ۲۶ تیر ۱۴۰۵ ↔ ۲۶ ژوئیه ۲۰۲۶) تست و تأیید شده است.
منبع الگوریتم: https://github.com/jalaali/jalaali-js

---

## 🎨 حالت تیره / روشن

توکن‌های رنگی در `css/theme.css` با دو مجموعه مقدار برای `[data-theme="dark"]` و `[data-theme="light"]` تعریف شده‌اند.
`ThemeManager.js` مقدار انتخابی کاربر را در `localStorage` ذخیره کرده و روی `<html>` اعمال می‌کند؛ سوییچ تغییر تم در صفحه **تنظیمات** قرار دارد.

---

## 🚀 نحوه اجرا و استقرار روی GitHub Pages

1. محتوای این پوشه را در یک مخزن (Repository) گیت‌هاب جدید قرار دهید.
2. به بخش **Settings → Pages** مخزن بروید.
3. Source را روی شاخه `main` و پوشه `/ (root)` تنظیم کنید.
4. پس از چند دقیقه، سایت روی آدرسی مثل `https://username.github.io/repo-name/` در دسترس خواهد بود.
5. روی موبایل، از منوی مرورگر گزینه «Add to Home Screen» را انتخاب کنید تا اپلیکیشن نصب شود.

> ⚠️ توجه: چون پروژه از ES Modules استفاده می‌کند، اجرای مستقیم فایل `index.html` با دوبار کلیک (`file://`) در برخی مرورگرها کار نمی‌کند. برای تست لوکال یک سرور استاتیک ساده اجرا کنید:
> ```bash
> npx serve .
> # یا
> python -m http.server 8080
> ```

---

## 🔒 حریم خصوصی

هیچ داده‌ای به هیچ سروری ارسال نمی‌شود. تمام تراکنش‌ها، دسته‌بندی‌ها و تنظیمات فقط در `localStorage` مرورگر شما ذخیره می‌شوند. برای پشتیبان‌گیری منظم از منوی «تنظیمات → خروجی کامل (JSON)» استفاده کنید.

---

## 📂 ساختار فایل‌ها

```
finance-pwa/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   ├── theme.css       # توکن‌های رنگ Dark/Light
│   ├── reset.css
│   ├── layout.css
│   ├── components.css
│   └── pages.css
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── js/
    ├── main.js
    ├── domain/...
    ├── application/...
    ├── infrastructure/...
    └── presentation/...
```

---

**ساخته‌شده با ❤️ توسط محمدحسین کرمی — [mhkarami97.ir](https://mhkarami97.ir)**
