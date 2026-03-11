import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'url';

const DEFAULT_CONFIG = {
  baseUrl: process.env.BOOKING_TEST_BASE_URL || 'http://localhost:3000',
  bookingPath: process.env.BOOKING_TEST_PATH || '/book',
  customerName: process.env.BOOKING_TEST_CUSTOMER_NAME || 'Favobi Test Customer',
  customerEmail: process.env.BOOKING_TEST_CUSTOMER_EMAIL || 'tobechukwufavobi@gmail.com',
  phone: process.env.BOOKING_TEST_PHONE || '08000000000',
  service: process.env.BOOKING_TEST_SERVICE || 'premium-barbing',
  date: process.env.BOOKING_TEST_DATE || '2026-04-20',
  time: process.env.BOOKING_TEST_TIME || '10:00',
  price: process.env.BOOKING_TEST_PRICE || '1000000',
  successSelector: process.env.BOOKING_TEST_SUCCESS_SELECTOR || '#bookingSuccess',
  slowMo: Number(process.env.BOOKING_TEST_SLOWMO || 50),
  headless: process.env.BOOKING_TEST_HEADLESS === 'true' ? true : false,
};

const fillInput = async (page, selector, value) => {
  await page.waitForSelector(selector, { visible: true, timeout: 10000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, value);
};

export async function runBookingTest(overrides = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...overrides,
  };

  const browser = await puppeteer.launch({
    headless: config.headless,
    slowMo: config.slowMo,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  try {
    const page = await browser.newPage();

    await page.goto(`${config.baseUrl}${config.bookingPath}`, {
      waitUntil: 'networkidle2',
    });

    await fillInput(page, '#customerName', config.customerName);
    await fillInput(page, '#customerEmail', config.customerEmail);
    await fillInput(page, '#phone', config.phone);

    await page.waitForSelector('#service', { visible: true, timeout: 10000 });
    await page.select('#service', config.service);

    await fillInput(page, '#date', config.date);
    await fillInput(page, '#time', config.time);
    await fillInput(page, '#price', config.price);

    await page.waitForSelector('#bookButton', { visible: true, timeout: 10000 });
    await page.click('#bookButton');

    await page.waitForSelector(config.successSelector, { timeout: 10000 });

    console.log('Booking created successfully.');
    console.log('Confirmation email should be sent to:');
    console.log(config.customerEmail);
  } finally {
    await browser.close();
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runBookingTest().catch((error) => {
    console.error('Booking email test failed:', error);
    process.exit(1);
  });
}
