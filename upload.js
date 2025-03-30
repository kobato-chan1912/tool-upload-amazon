const Genlogin = require('./Genlogin');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const speakeasy = require('speakeasy');
const axios = require("axios")

function processCategories(text) {
    // Remove "Books ›" from the text
    let cleanedText;
    if (!text.includes("Kindle Books ›")) {
        cleanedText = text.replace(/Books ›/g, '');

    } else {
        cleanedText = text.replace(/Kindle Books ›/g, '');
    }


    // Split by " | " to create array
    const categories = cleanedText.split(' | ');

    // Process each category
    const result = categories.map(category => {
        // Replace > with › for consistency and split
        const parts = category.replace(/>/g, '›').split(' › ');

        const categoryObj = {
            mainCategory: parts[0].trim()
        };

        if (parts.length > 1) {
            if (parts.length === 2) {
                categoryObj.placement = parts[1].trim();
            } else if (parts.length === 3) {
                categoryObj.subCategory = parts[1].trim();
                categoryObj.placement = parts[2].trim();
            }
        }

        return categoryObj;
    });

    return result;
}

async function selectCategory(page, selectName, textSearch) {
    await page.evaluate((selectName, textSearch) => {
        const select = document.querySelector(`select[name="${selectName}"]`);
        const options = Array.from(select.options);
        const targetOption = options.find(option => option.text === textSearch);
        if (targetOption) {
            select.value = targetOption.value;
            const event = new Event('change', { bubbles: true });
            select.dispatchEvent(event);

        }
    }, selectName, textSearch);
}

async function clearInput(page, selector) {
    await page.focus(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');

}

async function selectPlacement(page, textSearch) {
    await page.evaluate((textSearch) => {
        const labels = document.querySelectorAll('.a-checkbox-label');

        for (const label of labels) {
            if (label.textContent.trim() == textSearch) {
                const checkbox = label.parentElement.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    checkbox.click(); // Click để chọn checkbox
                }
                break; // Thoát vòng lặp sau khi tìm thấy
            }
        }
    }, textSearch);


}

function parseTrimSize(trimSize) {
    const match = trimSize.match(/(\d+\.?\d*)\s*x\s*(\d+\.?\d*)/i);
    if (match) {
        return {
            w: parseFloat(match[1]),
            h: parseFloat(match[2])
        };
    }
    return null; // Trả về null nếu không tìm thấy kích thước hợp lệ
}

// 

async function solveCategory(page, categoryText) {
    let categoryArr = processCategories(categoryText)

    await page.click("#categories-modal-button")
    await sleep(5000)

    let subIndex = 0;
    for (const [index, category] of categoryArr.entries()) {

        let mainIndex = index
        if (mainIndex == 2) {
            mainIndex = 4
        }

        subIndex = subIndex + 2;

        if (index !== 0) {
            await page.click("#react-aui-modal-content-1 > span > div:nth-child(3) > span > span > button")
            await sleep(5000)
        }

        if (category.mainCategory !== undefined) {
            await selectCategory(page, `react-aui-${mainIndex}`, category.mainCategory)
            await sleep(5000)
        }

        if (category.mainCategory == "Non-Classifiable" ||
            category.mainCategory == "Classics" ||
            category.mainCategory == "General") {
            await selectPlacement(page, category.mainCategory)
            await sleep(5000)
        }

        if (category.subCategory !== undefined) {
            await selectCategory(page, `react-aui-${subIndex}`, category.subCategory)
            await sleep(5000)
        }

        if (category.placement !== undefined) {
            await selectPlacement(page, category.placement)
            await sleep(5000)
        }



    }

    await sleep(5000)
    await page.click("#react-aui-modal-footer-1 > span > span.a-button.a-button-primary > span > button")
    await sleep(5000)
}


async function run(data) {

    const profileID = data.gpm_id
    let browser;

    if (process.platform === 'win32') {

        // Windows - Using GPM-Login 

        const API_BASE_URL = "http://127.0.0.1:19995/api/v3"; // Địa chỉ API GPM-Login
        const startResponse = await axios.get(`${API_BASE_URL}/profiles/start/${profileID}`);
        if (!startResponse.data.success) {
            throw new Error(`Không thể mở profile: ${startResponse.data.message}`);
        }

        const { remote_debugging_address } = startResponse.data.data;
        await new Promise(resolve => setTimeout(resolve, 5000));
        browser = await puppeteer.connect({
            browserURL: `http://${remote_debugging_address}`,
            defaultViewport: null,
        });


    } else {
        // MAC OS - Using GenLogin

        const genlogin = new Genlogin("");
        const { wsEndpoint } = await genlogin.runProfile(profileID)

        browser = await puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
            ignoreHTTPSErrors: true,
            defaultViewport: false
        });

    }

    const page = await browser.newPage();
    page.setDefaultTimeout(300000);

    try {

        // login
        await sleep(3000)
        await clearInput(page, "#ap_email")
        await sleep(2000)
        await page.type("#ap_email", data.email, { delay: 50 })
        await page.click("#continue")
        await page.waitForSelector("#ap_password", { timeout: 20000 })
        await sleep(3000)
        await clearInput(page, "#ap_password")
        await sleep(2000)
        await page.type("#ap_password", data.password, { delay: 50 })
        await page.click("#signInSubmit")
        await page.waitForSelector("#auth-get-new-otp-link", { timeout: 20000 })
        await sleep(3000)
        await page.click("#auth-get-new-otp-link")
        await page.waitForSelector("input[name=otpDeviceContext]", { timeout: 20000 })
        await sleep(3000)
        await page.click("input[name=otpDeviceContext]")
        await sleep(3000)
        await page.click("#auth-send-code")

        const rawSecret = data.secret;

        // Loại bỏ dấu cách
        const secret = rawSecret.replace(/\s+/g, '');
        const token = speakeasy.totp({
            secret: secret,
            encoding: 'base32'
        });

        await page.waitForSelector("#auth-mfa-otpcode", { timeout: 20000 })
        await sleep(3000)
        await page.type("#auth-mfa-otpcode", token, { delay: 50 })
        await page.click("#auth-signin-button")
        await sleep(10000)

    } catch (error) {

    }

    for (let book of data.books) {

        // 1 - Upload paperback

        await page.goto('https://kdp.amazon.com/en_US/title-setup/paperback/new/details?ref_=cr_ti/');

        // Set screen size.
        // await page.setViewport({ width: 1280, height: 720 });

        // Điền book-title 
        await page.type("#data-print-book-title", book["book title"], { delay: 50 })
        await page.type("#data-print-book-subtitle", book["sub title"], { delay: 50 })


        await page.type("#data-print-book-primary-author-last-name", book["author (last name)"], { delay: 50 })


        await page.$eval('#cke_editor1', (el, description) => {
            CKEDITOR.instances['editor1'].setData(description);
        }, book["description"]);


        await page.type("#data-print-book-keywords-0", book["keyword1"], { delay: 50 })
        await page.type("#data-print-book-keywords-1", book["keyword2"], { delay: 50 })
        await page.type("#data-print-book-keywords-2", book["keyword3"], { delay: 50 })
        await page.type("#data-print-book-keywords-3", book["keyword4"], { delay: 50 })
        await page.type("#data-print-book-keywords-4", book["keyword5"], { delay: 50 })
        await page.type("#data-print-book-keywords-5", book["keyword6"], { delay: 50 })
        await page.type("#data-print-book-keywords-6", book["keyword7"], { delay: 50 })

        // Chọn non-public
        await page.click("#non-public-domain")

        // Cài đặt adult mode
        let adult = book["adult"];
        if (adult == "NO") {
            await page.click('#data-print-book-is-adult-content > div > div > fieldset > div:nth-child(2) > div > label > input[type=radio]') // nếu adult thì 0
        }



        // Chọn category

        await sleep(5000)
        let categoryText = book["category"]
        await solveCategory(page, categoryText)




        // Xư rlys lowContent
        let lowContent = book["Low content"];
        if (lowContent == "YES") {
            await page.click("#data-view-is-lcb")
        }

        let largePrint = book["Large Print"];
        if (largePrint == "YES") {
            await page.click("#data-print-book-large-print")
        }


        // Click save
        await page.click("#save-and-continue-announce")
        await page.waitForSelector("#section-interior", { timeout: 100000 })
        await sleep(5000)

        // Nếu low content = Yes không cần làm gì

        if (lowContent == "NO") {
            await page.click("#section-isbn-v2 .a-button-input")
            await sleep(3000)
            await page.click("#free-isbn-confirm-button > span > input")
            await page.sleep(10000)
        }

        // Click Print Option

        let printOption = book["paper type"]
        await page.click(`#a-autoid-${printOption - 1}-announce`)


        let trimSize = book["trim size"]
        let formatTrim = parseTrimSize(trimSize)
        if (formatTrim.w !== 6 || formatTrim.h !== 9) {
            await page.click("#trim-size-btn-announce")
            await sleep(3000)
            await page.type("#inputWidth", formatTrim.w, { delay: 50 })
            await page.type("#inputHeight", formatTrim.h, { delay: 50 })
            await page.click("#a-autoid-11 > span > input")
            await sleep(3000)
        }

        let bleedSetting = book["bleed setting"];
        await page.click(`#a-autoid-${bleedSetting + 3}-announce`)

        let paperCover = book["paperback cover"];
        await page.click(`#a-autoid-${paperCover + 5}-announce`)

        // Manual Script Upload

        let manualScript = book["manuscript paperback"]
        const manualScriptUpload = await page.waitForSelector('#data-print-book-publisher-interior-file-upload-AjaxInput');
        await manualScriptUpload.uploadFile(manualScript);
        await page.waitForSelector("#data-print-book-publisher-interior-file-upload-success", { visible: true })
        await sleep(5000)


        // Cover Upload

        let coverFile = book["cover paperback"]
        await page.click("#data-print-book-publisher-cover-choice-accordion > div.a-box.a-last > div > div.a-accordion-row-a11y > a")
        await sleep(3000)
        const coverUpload = await page.waitForSelector('#data-print-book-publisher-cover-file-upload-AjaxInput');
        await coverUpload.uploadFile(coverFile);
        await page.waitForSelector("#data-print-book-publisher-cover-file-upload-success", { visible: true })
        await sleep(5000)

        // AI Content - Always NO

        await page.click('div[data-a-accordion-row-name="no"] .a-accordion-row-a11y a')


        // Preview 

        await sleep(10000)
        await page.waitForSelector("#print-preview-announce:not([disabled]")
        await sleep(3000)
        // await page.click("#print-preview-announce") // not worked
        await page.evaluate(() => {
            document.querySelector('#print-preview-announce').click();
        });

        try {


            await page.waitForSelector("#print-preview-confirm-button-announce", { timeout: 5000 })
            await sleep(3000)
            await page.evaluate(() => {
                document.querySelector('#print-preview-confirm-button-announce').click();
            });

        } catch (error) {
        }


        await page.waitForSelector("#printpreview_approve_button_enabled > span > a")
        await sleep(10000)
        await page.click("#printpreview_approve_button_enabled > span > a")
        await page.waitForSelector("#save-and-continue-announce")
        await sleep(5000)
        await page.click("#save-and-continue-announce")



        // Price Input 

        await page.waitForSelector(".price-input")
        await sleep(5000)
        let price = book["price paperpack"].toString()
        await page.type("#data-pricing-print-us-price-input > input", price, { delay: 50 })
        await sleep(7000)
        await page.click("#save-and-publish-announce")

        await page.waitForSelector("#publish-confirm-popover-print-start")
        await sleep(3000)



        // Ấn close để về lại màn hình

        await page.click("#a-popover-1 > div > header > button") // ALERT: chỗ này ấn close 
        await page.waitForSelector("span[data-action=add-digital-format]")
        await sleep(5000)



        /////// Upload Kindle Book ////// 


        if (book['manuscript ebook'] !== '') {
            await page.click("span[data-action=add-digital-format]")
            await page.waitForSelector("#save-and-continue-announce")
            await sleep(5000)

            // Xử lý category kindle book

            let categoryKindleBook = book["category ebooks"]
            await solveCategory(page, categoryKindleBook)

            await page.click("#save-and-continue-announce")
            await sleep(5000)


            await page.waitForSelector("#data-assets-interior-file-upload-accepted-extensions")
            await sleep(5000)


            // Kindle Book upload manualscript

            let ebookScriptFile = book['manuscript ebook']
            const ebookScriptUpload = await page.waitForSelector('#data-assets-interior-file-upload-AjaxInput');
            await ebookScriptUpload.uploadFile(ebookScriptFile);
            try {
                await sleep(5000)
                await page.click("#file-warn-extension-continue-announce")
            } catch (error) {
                //// Continue ////      
            }
            await page.waitForSelector("#data-assets-interior-file-upload-success", { visible: true })
            await sleep(5000)


            // Ebook cover

            let coverEbook = book['cover ebook']
            await page.click("#data-cover-choice-accordion > div.a-box.a-last > div > div.a-accordion-row-a11y > a > i")
            await sleep(3000)
            const ebookCoverUpload = await page.waitForSelector('#data-assets-cover-file-upload-AjaxInput');
            await ebookCoverUpload.uploadFile(coverEbook);
            await page.waitForSelector("#data-assets-cover-file-upload-success", { visible: true })
            await sleep(5000)

            // No AI 
            await page.click("#form-main-1 > div > div:nth-child(62) > div > div.a-column.a-span10.a-span-last > div > div > div > span > div:nth-child(3) > div > div:nth-child(2) > div > div > a")
            await sleep(3000)
            await page.click("#save-and-continue-announce")


            await page.waitForSelector(".price-input", { timeout: 300000 })
            await sleep(5000)

            //  Chỉnh giá royalty 
            let royalty = book['Royalty Ebook']
            if (royalty == '70%' || royalty == 0.7) {
                await page.click("#data-digital-royalty-rate > div > div > fieldset > div.a-radio.a-radio-fancy.form-submit-blacklisted.form-incr-validate-blacklist.jele-binding-disabled.unsaved-changes-ignore.a-spacing-none > label > input[type=radio]")
            }
            else {
                await page.click("#data-digital-royalty-rate > div > div > fieldset > div.a-radio.a-radio-fancy.form-submit-blacklisted.form-incr-validate-blacklist.jele-binding-disabled.unsaved-changes-ignore.a-spacing-small > label > input[type=radio]")
            }

            await sleep(3000)
            let priceEbook = book['price_ebook'].toString()
            await page.type("#data-digital-us-price-input > input", priceEbook, { delay: 50 })
            await sleep(7000)
            await page.click("#save-and-publish-announce")


            await page.waitForSelector("#publish-confirm-popover-digital-done > span > input")
            await sleep(3000)
            await page.click("#a-popover-1 > div > header > button")
            await sleep(5000)
        }



        await page.goto("https://kdp.amazon.com/en_US/bookshelf?ref_=kdp_kdp_TAC_TN_bs")

        // Upload hardcover 
        await page.waitForSelector("span[data-action=add-hardcover-format]")
        await page.click("span[data-action=add-hardcover-format]")
        await page.waitForSelector("#save-and-continue-announce")
        await sleep(3000)
        await page.click("#save-and-continue-announce")


        let hardcoverScript = book['manuscript Hard Cover']
        const hardcoverUpload = await page.waitForSelector('#data-print-book-publisher-interior-file-upload-AjaxInput');
        await hardcoverUpload.uploadFile(hardcoverScript);
        await page.waitForSelector("#data-print-book-publisher-interior-file-upload-success", { visible: true })
        await sleep(5000)

        // hardcover book
        let hardcoverFile = book['cover Hardcover']
        await page.click("#data-print-book-publisher-cover-choice-accordion > div.a-box.a-last > div > div.a-accordion-row-a11y > a")
        await sleep(3000)
        const hardcoverBook = await page.waitForSelector('#data-print-book-publisher-cover-file-upload-AjaxInput');
        await hardcoverBook.uploadFile(hardcoverFile);
        await page.waitForSelector("#data-print-book-publisher-cover-file-upload-success", { visible: true })
        await sleep(5000)

        // NO AI
        await page.click("#section-generative-ai > div > div.a-column.a-span10.a-span-last > div > div > div > span > div:nth-child(3) > div > div:nth-child(2) > div > div > a")


        // Click Preview

        await page.evaluate(() => {
            document.querySelector('#print-preview-announce').click();
        });

        try {
            await page.waitForSelector("#print-preview-confirm-button-announce", { timeout: 5000 })
            await sleep(3000)
            await page.evaluate(() => {
                document.querySelector('#print-preview-confirm-button-announce').click();
            });
        } catch (error) {
        }

        await page.waitForSelector("#printpreview_approve_button_enabled > span", { timeout: 300000 })
        await sleep(10000)
        await page.click("#printpreview_approve_button_enabled > span")
        await page.waitForSelector("#save-and-continue")
        await sleep(3000)
        await page.click("#save-and-continue")
        await page.waitForSelector(".price-input")
        await sleep(3000)
        let hardcoverPrice = book['Price Harcover'].toString()
        await page.type("#data-pricing-print-us-price-input > input", hardcoverPrice, { delay: 50 })
        await sleep(7000)
        await page.click("#save-and-publish-announce")
        await page.waitForSelector("#publish-confirm-popover-hardcover-done")
        console.log(`--- Upload ${book["book title"]} done ---`)

    }

    await browser.close() // Done 

}

module.exports = { run }