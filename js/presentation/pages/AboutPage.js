import { TopBar } from '../components/TopBar.js';

/**
 * Page: AboutPage
 * Introduces the application and its developer.
 */
export class AboutPage {
  render() {
    const page = document.createElement('div');
    page.className = 'page';
    page.appendChild(TopBar.render('درباره ما'));

    const content = document.createElement('div');
    content.className = 'page__content about-page';
    content.innerHTML = `
      <section class="about-card">
        <div class="about-card__avatar"><i class="fa-solid fa-wallet"></i></div>
        <h2>مدیریت مالی من</h2>
        <p>
          یک اپلیکیشن وب پیشرو (PWA) برای مدیریت دخل و خرج شخصی، طراحی‌شده برای کار کاملاً آفلاین.
          تمام اطلاعات شما فقط در مرورگر خودتان (localStorage) ذخیره می‌شود و هیچ داده‌ای
          به هیچ سروری ارسال نمی‌گردد؛ یعنی حریم خصوصی مالی شما صد در صد در اختیار خود شماست.
        </p>
      </section>

      <section class="about-card">
        <h3>امکانات کلیدی</h3>
        <ul class="about-list">
          <li><i class="fa-solid fa-check"></i> ثبت نامحدود تراکنش درآمد و هزینه</li>
          <li><i class="fa-solid fa-check"></i> دسته‌بندی‌های پیش‌فرض و قابل شخصی‌سازی</li>
          <li><i class="fa-solid fa-check"></i> چند کیف پول (نقدی، بانکی، پس‌انداز و ...)</li>
          <li><i class="fa-solid fa-check"></i> تقویم شمسی کامل و بومی برای ثبت تاریخ</li>
          <li><i class="fa-solid fa-check"></i> گزارش نموداری هزینه‌ها به تفکیک دسته‌بندی</li>
          <li><i class="fa-solid fa-check"></i> خروجی گرفتن از داده‌ها (CSV و JSON) و بازیابی اطلاعات</li>
          <li><i class="fa-solid fa-check"></i> نصب به‌عنوان اپلیکیشن (PWA) و کارکرد آفلاین کامل</li>
          <li><i class="fa-solid fa-check"></i> طراحی موبایل-فرست با نویگیشن پایین صفحه</li>
        </ul>
      </section>

      <section class="about-card about-card--developer">
        <div class="about-card__avatar about-card__avatar--dev"><i class="fa-solid fa-code"></i></div>
        <h3>سازنده</h3>
        <p class="dev-name">محمدحسین کرمی</p>
        <p class="dev-role">توسعه‌دهنده نرم‌افزار — .NET Core / Angular / Vue</p>
        <p>
          این پروژه به‌عنوان یک نمونه از معماری تمیز و اصول SOLID در جاوااسکریپت خام
          (بدون فریم‌ورک) طراحی و پیاده‌سازی شده است.
        </p>
        <a href="https://mhkarami97.ir" target="_blank" rel="noopener noreferrer" class="btn btn--outline btn--full">
          <i class="fa-solid fa-globe"></i> مشاهده وبسایت شخصی
        </a>
      </section>
    `;
    page.appendChild(content);
    return page;
  }
}
