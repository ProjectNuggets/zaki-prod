import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const outDir = import.meta.dirname;
mkdirSync(outDir, { recursive: true });

const fontsDir = join(import.meta.dirname, '..', 'fonts');
const zainBold = readFileSync(join(fontsDir, 'Zain-Bold.ttf')).toString('base64');
const zainRegular = readFileSync(join(fontsDir, 'Zain-Regular.ttf')).toString('base64');
const climateCrisis = readFileSync(join(fontsDir, 'ClimateCrisis.ttf')).toString('base64');
// Lexend Deca not needed for this carousel - only used in footers as fallback

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
  font-family: 'Climate Crisis';
  src: url(data:font/ttf;base64,${climateCrisis}) format('truetype');
  font-weight: 400;
}
`;

// Brand system from Figma
const BRAND = {
  red: '#f10202',
  white: '#ffffff',
  black: '#000000',
  muted: '#888888',
  bg: 'linear-gradient(180deg, #000000 0%, #2b0000 70%, #1a0000 100%)',
};

const header = `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; width: 100%; padding: 0 65px; box-sizing: border-box; position: absolute; top: 50px; left: 0;">
    <span style="color: ${BRAND.red}; font-size: 63px; font-weight: 700; font-family: 'Zain';">زكي</span>
    <span style="color: ${BRAND.red}; font-size: 56px; font-weight: 400; font-family: 'Climate Crisis';">ZAKI</span>
  </div>
`;

const footer = `
  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 65px; box-sizing: border-box; position: absolute; bottom: 45px; left: 0;">
    <span style="color: ${BRAND.red}; font-size: 25px; font-family: 'Zain'; font-weight: 400;">@chatzaki.ai</span>
    <span style="color: ${BRAND.red}; font-size: 22px; font-family: 'Zain'; font-weight: 400;">www.chatzaki.com</span>
  </div>
`;

const slides = [
  {
    name: 'slide1-hook.png',
    html: `
    <div style="
      width: 1080px; height: 1350px;
      background: ${BRAND.bg};
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 65px; box-sizing: border-box;
      font-family: 'Zain', sans-serif;
      text-align: center;
      position: relative;
    ">
      ${header}

      <h1 style="
        color: ${BRAND.red}; font-size: 116px; font-weight: 400;
        direction: rtl; line-height: 1.3;
        font-family: 'Zain';
        margin: 0;
      ">كل ال chatbots<br>كذبوا عليك</h1>

      ${footer}
    </div>`
  },
  {
    name: 'slide2-problem.png',
    html: `
    <div style="
      width: 1080px; height: 1350px;
      background: ${BRAND.bg};
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 80px; box-sizing: border-box;
      font-family: 'Zain', sans-serif;
      text-align: center;
      position: relative;
    ">
      ${header}

      <p style="
        color: ${BRAND.white}; font-size: 75px; font-weight: 400;
        direction: rtl; line-height: 1.5;
        font-family: 'Zain';
        margin: 0 0 50px 0;
      ">قالوا لك<br><span style="color: ${BRAND.red}; font-weight: 700;">بنتذكر.</span></p>

      <p style="
        color: ${BRAND.white}; font-size: 65px; font-weight: 400;
        direction: rtl; line-height: 1.5;
        font-family: 'Zain';
        margin: 0;
      ">بس كل مرة<br>بتبدأ من <span style="color: ${BRAND.red}; font-weight: 700;">الصفر.</span></p>

      ${footer}
    </div>`
  },
  {
    name: 'slide3-solution.png',
    html: `
    <div style="
      width: 1080px; height: 1350px;
      background: ${BRAND.bg};
      display: flex; flex-direction: column; justify-content: flex-start;
      padding: 160px 65px 80px; box-sizing: border-box;
      font-family: 'Zain', sans-serif;
      position: relative;
    ">
      ${header}

      <h2 style="
        color: ${BRAND.red}; font-size: 70px; font-weight: 400;
        direction: rtl; text-align: right;
        font-family: 'Zain';
        margin: 0 0 50px 0;
      ">زكي عنده ٩ انواع ذاكرة</h2>

      <div style="direction: rtl; text-align: right;">
        <div style="color: ${BRAND.white}; font-size: 46px; font-weight: 700; margin: 22px 0; display: flex; align-items: center; gap: 16px; font-family: 'Zain';">
          <span style="color: ${BRAND.red};">→</span>
          <span>حقائق، تفضيلات، اهداف</span>
        </div>
        <div style="color: ${BRAND.white}; font-size: 46px; font-weight: 700; margin: 22px 0; display: flex; align-items: center; gap: 16px; font-family: 'Zain';">
          <span style="color: ${BRAND.red};">→</span>
          <span>علاقات، مشاعر، تحديات</span>
        </div>
        <div style="color: ${BRAND.white}; font-size: 46px; font-weight: 700; margin: 22px 0; display: flex; align-items: center; gap: 16px; font-family: 'Zain';">
          <span style="color: ${BRAND.red};">→</span>
          <span>بيكشف <span style="color: ${BRAND.red};">التناقضات</span></span>
        </div>
        <div style="color: ${BRAND.white}; font-size: 46px; font-weight: 700; margin: 22px 0; display: flex; align-items: center; gap: 16px; font-family: 'Zain';">
          <span style="color: ${BRAND.red};">→</span>
          <span>بيسألك <span style="color: ${BRAND.red};">قبل</span> ما يحفظ</span>
        </div>
        <div style="color: ${BRAND.white}; font-size: 46px; font-weight: 700; margin: 22px 0; display: flex; align-items: center; gap: 16px; font-family: 'Zain';">
          <span style="color: ${BRAND.red};">→</span>
          <span>٤ سياسات خصوصية <span style="color: ${BRAND.red};">انت بتقرر</span></span>
        </div>
      </div>

      ${footer}
    </div>`
  },
  {
    name: 'slide4-cta.png',
    html: `
    <div style="
      width: 1080px; height: 1350px;
      background: ${BRAND.bg};
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      padding: 60px 65px; box-sizing: border-box;
      font-family: 'Zain', sans-serif;
      text-align: center;
      position: relative;
    ">
      ${header}

      <span style="color: ${BRAND.red}; font-size: 270px; font-weight: 400; font-family: 'Climate Crisis'; letter-spacing: 8px; margin-bottom: 10px;">ZAKI</span>

      <h1 style="
        color: ${BRAND.white}; font-size: 75px; font-weight: 400;
        direction: rtl; line-height: 1.4;
        font-family: 'Zain';
        margin: 10px 0 30px 0;
      ">ذاكرة <span style="color: ${BRAND.red};">حقيقية.</span><br>مش كلام.</h1>

      <div style="
        margin-top: 40px;
        background: ${BRAND.red};
        padding: 20px 70px;
        border-radius: 12px;
      ">
        <span style="color: ${BRAND.white}; font-size: 40px; font-weight: 400; font-family: 'Climate Crisis'; letter-spacing: 3px;">WWW.CHATZAKI.COM</span>
      </div>

      ${footer}
    </div>`
  }
];

async function generate() {
  const browser = await puppeteer.launch({ headless: true });

  for (const slide of slides) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${fontFaces} * { margin: 0; padding: 0; }</style></head><body style="margin:0;padding:0;">${slide.html}</body></html>`);
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
