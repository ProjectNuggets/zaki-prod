import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outDir = join(import.meta.dirname, 'day1-urgency');
mkdirSync(outDir, { recursive: true });

const fontsDir = join(import.meta.dirname, 'fonts');
const zainBold = readFileSync(join(fontsDir, 'Zain-Bold.ttf')).toString('base64');
const zainRegular = readFileSync(join(fontsDir, 'Zain-Regular.ttf')).toString('base64');
const bebasNeue = readFileSync(join(fontsDir, 'BebasNeue-Regular.ttf')).toString('base64');

const fontFaces = `
@font-face {
  font-family: 'Zain';
  src: url(data:font/ttf;base64,${zainBold}) format('truetype');
  font-weight: 700;
}
@font-face {
  font-family: 'Zain';
  src: url(data:font/ttf;base64,${zainRegular}) format('truetype');
  font-weight: 400;
}
@font-face {
  font-family: 'Bebas Neue';
  src: url(data:font/ttf;base64,${bebasNeue}) format('truetype');
  font-weight: 400;
}
`;

const slides = [
  {
    name: 'slide2-benefits.png',
    html: `
    <div style="
      width: 1080px; height: 1350px;
      background: linear-gradient(180deg, #0a0a0a 0%, #1a0808 50%, #2a0a0a 100%);
      display: flex; flex-direction: column; justify-content: flex-start;
      padding: 50px 65px; box-sizing: border-box;
      font-family: 'Zain', sans-serif;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <span style="color: #d24430; font-size: 48px; font-weight: 700;">زكي</span>
        <span style="color: #d24430; font-size: 48px; font-weight: 400; font-family: 'Bebas Neue'; letter-spacing: 6px;">ZAKI</span>
      </div>

      <h1 style="
        color: #ffffff; font-size: 72px; font-weight: 700;
        text-align: right; direction: rtl;
        margin: 30px 0 20px 0; line-height: 1.3;
        font-family: 'Zain';
      ">ال <span style="font-family: 'Bebas Neue'; font-size: 68px; letter-spacing: 3px;">Inner Circle</span><br><span style="color: #d24430;">مش اشتراك عادي</span></h1>

      <div style="direction: rtl; text-align: right; margin-top: 30px;">
        <div style="color: #ffffff; font-size: 46px; font-weight: 700; margin: 32px 0; display: flex; align-items: center; gap: 20px; font-family: 'Zain';">
          <span style="color: #d24430; font-size: 50px; font-weight: 700;">→</span>
          <span>سعر ثابت <span style="color: #d24430;">للأبد</span></span>
        </div>
        <div style="color: #ffffff; font-size: 46px; font-weight: 700; margin: 32px 0; display: flex; align-items: center; gap: 20px; font-family: 'Zain';">
          <span style="color: #d24430; font-size: 50px; font-weight: 700;">→</span>
          <span>تأثير <span style="color: #d24430;">مباشر</span> على المنتج</span>
        </div>
        <div style="color: #ffffff; font-size: 46px; font-weight: 700; margin: 32px 0; display: flex; align-items: center; gap: 20px; font-family: 'Zain';">
          <span style="color: #d24430; font-size: 50px; font-weight: 700;">→</span>
          <span>وصول <span style="color: #d24430;">مبكر</span> لكل ميزة جديدة</span>
        </div>
        <div style="color: #ffffff; font-size: 46px; font-weight: 700; margin: 32px 0; display: flex; align-items: center; gap: 20px; font-family: 'Zain';">
          <span style="color: #d24430; font-size: 50px; font-weight: 700;">→</span>
          <span>قناة <span style="color: #d24430;">خاصة</span> مع المؤسس</span>
        </div>
        <div style="color: #ffffff; font-size: 46px; font-weight: 700; margin: 32px 0; display: flex; align-items: center; gap: 20px; font-family: 'Zain';">
          <span style="color: #d24430; font-size: 50px; font-weight: 700;">→</span>
          <span>اسمك في <span style="color: #d24430;">قائمة المؤسسين</span></span>
        </div>
      </div>

      <div style="
        margin-top: auto;
        display: flex; justify-content: space-between; align-items: center;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #888; font-size: 26px; font-family: 'Zain';">@chatzaki.ai</span>
        </div>
        <span style="color: #888; font-size: 26px; font-family: 'Zain';">www.chatzaki.com</span>
      </div>
    </div>`
  },
  {
    name: 'slide3-cta.png',
    html: `
    <div style="
      width: 1080px; height: 1350px;
      background: linear-gradient(180deg, #0a0a0a 0%, #1a0808 50%, #2a0a0a 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 70px; box-sizing: border-box;
      font-family: 'Zain', sans-serif;
      text-align: center;
    ">
      <span style="color: #d24430; font-size: 140px; font-weight: 400; font-family: 'Bebas Neue'; letter-spacing: 12px; margin-bottom: 20px;">ZAKI</span>

      <h1 style="
        color: #d24430; font-size: 90px; font-weight: 700;
        direction: rtl; line-height: 1.4;
        margin: 20px 0;
        font-family: 'Zain';
      ">الباب بيسكر<br>خلال أسبوعين</h1>

      <p style="
        color: #ffffff; font-size: 50px; font-weight: 700;
        direction: rtl; line-height: 1.6;
        margin: 40px 0;
        font-family: 'Zain';
      ">٥٠٠ مقعد فقط<br>ما في رجعة</p>

      <div style="
        margin-top: 50px;
        background: #d24430;
        padding: 22px 70px;
        border-radius: 14px;
      ">
        <span style="color: #ffffff; font-size: 44px; font-weight: 400; font-family: 'Bebas Neue'; letter-spacing: 4px;">WWW.CHATZAKI.COM</span>
      </div>

      <div style="
        margin-top: auto;
        display: flex; justify-content: space-between; align-items: center;
        width: 100%;
      ">
        <span style="color: #888; font-size: 26px; font-family: 'Zain';">@chatzaki.ai</span>
        <span style="color: #888; font-size: 26px; font-family: 'Zain';">www.chatzaki.com</span>
      </div>
    </div>`
  }
];

async function generate() {
  const browser = await puppeteer.launch({ headless: true });

  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${fontFaces} * { margin: 0; padding: 0; }</style></head><body style="margin:0;padding:0;">${slide.html}</body></html>`);
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    const outPath = join(outDir, slide.name);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log(`Generated: ${outPath}`);
    await page.close();
  }

  await browser.close();
  console.log('Done!');
}

generate().catch(console.error);
