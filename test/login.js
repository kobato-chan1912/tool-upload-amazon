const Genlogin = require('../Genlogin');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const speakeasy = require('speakeasy');

(async () => {
    const genlogin = new Genlogin("");
    const { wsEndpoint } = await genlogin.runProfile(22477377)
    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        ignoreHTTPSErrors: true,
        defaultViewport: false
    });
    const page = await browser.newPage();
    await page.goto("https://kdp.amazon.com/bookshelf ")
    await sleep(3000)
    await page.type("#ap_email", "blakett91@gmail.com", { delay: 50 })
    await page.click("#continue")
    await page.waitForSelector("#ap_password", {timeout: 20000})
    await sleep(3000)
    await page.type("#ap_password", "44444232323", { delay: 50 })
    await page.click("#signInSubmit")
    await page.waitForSelector("#auth-get-new-otp-link", {timeout: 20000})
    await sleep(3000)
    await page.click("#auth-get-new-otp-link")
    await page.waitForSelector("input[name=otpDeviceContext]", {timeout: 20000})
    await sleep(3000)
    await page.click("input[name=otpDeviceContext]")
    await sleep(3000)
    await page.click("#auth-send-code")


    const rawSecret = 'SVHK FWOC ZBD4 4OAZ WAOL TTN2 DX4K YCAD NEM7 FJ3X 2222 1111 0000';

    // Loại bỏ dấu cách
    const secret = rawSecret.replace(/\s+/g, '');
    const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
    });

    await page.waitForSelector("#auth-mfa-otpcode", {timeout: 20000})
    await sleep(3000)
    await page.type("#auth-mfa-otpcode", token, {delay: 50})
    await page.click("#auth-signin-button")
    await sleep(10000)

})();