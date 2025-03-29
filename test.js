const Genlogin = require('./Genlogin');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(res => setTimeout(res, ms));

async function run() {
    const genlogin = new Genlogin("");
    const { wsEndpoint } = await genlogin.runProfile(22415876)

    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        ignoreHTTPSErrors: true,
        defaultViewport: false
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(300000);


    await page.goto('https://pqina.nl/filepond/');

    // Set screen size.
    await page.setViewport({ width: 1280, height: 720 });

    let filePath = '/Users/dungvietmai/Downloads/KDP/Bìa\ Vintage\ Floral/Ebook/ebook\ 1.jpg'
    const manualScriptUpload = await page.waitForSelector('.filepond--browser');
    await manualScriptUpload.uploadFile(filePath);

    await sleep(20000)
    console.log("--- Upload done ---")


    await browser.close() // Done 

}

run()