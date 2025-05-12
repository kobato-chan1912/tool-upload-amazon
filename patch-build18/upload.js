const Genlogin = require('./Genlogin');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(res => setTimeout(res, ms));
const speakeasy = require('speakeasy');
const axios = require("axios")
const fs = require("fs").promises;

async function appendLog(filePath, text) {
    let logText = `[${new Date().toISOString()}] ${text}\n`;
    try {
        await fs.appendFile(filePath, logText, "utf-8");
    } catch (error) {
        console.error("Lỗi ghi log:", error);
    }
}


async function typeWithRandomDelay(page, config, selector, text) {
    try {

        let index = 0;
        while (index < text.length) {
            const chunkSize = getRandomChunkSize();
            const chunk = text.slice(index, index + chunkSize);

            // Đảm bảo focus trước khi gõ
            await page.focus(selector);

            const typeDelay = await randomTypeTime(config);
            await page.type(selector, chunk, { delay: typeDelay });

            const delay = await randomTypeTime(config);
            await sleep(delay);

            index += chunkSize;
        }
    } catch (error) {
        console.error(`Error in typeWithRandomDelay:`, error);
    }
}

async function getOtp(secret) {
    try {
        const response = await axios.get('https://otp.streaming-go.shop/', {
            params: { secret }
        });

        let rsp = response.data;
        return rsp.otp;
    } catch (error) {
        return {
            status: 'error',
            message: error.response?.data?.message || error.message
        };
    }
}



function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomChunkSize() {
    const min = 1;
    const max = 6;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTypeTime(config) {
    return getRandomInt(config.typingTime.min, config.typingTime.max);
}

function randomActionTime(config) {
    return getRandomInt(config.actionTime.min * 1000, config.actionTime.max * 1000);
}

function randomUploadInterval(config) {
    return getRandomInt(config.uploadInterval.min * 1000, config.uploadInterval.max * 1000);
}


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


const AISelector = {
    select1: {
        0: "NONE",
        1: "PARTIAL_AND_MINIMAL",
        2: "PARTIAL_AND_EXTENSIVE",
        3: "ENTIRE_AND_MINIMAL",
        4: "ENTIRE_AND_EXTENSIVE"
    },
    select2: {
        0: "NONE",
        1: "FEW_AND_MINIMAL",
        2: "FEW_AND_EXTENSIVE",
        3: "MANY_AND_MINIMAL",
        4: "MANY_AND_EXTENSIVE"
    },
    select3: {
        0: "NONE",
        1: "PARTIAL_AND_MINIMAL",
        2: "PARTIAL_AND_EXTENSIVE",
        3: "ENTIRE_AND_MINIMAL",
        4: "ENTIRE_AND_EXTENSIVE"
    }
}

async function selectAI(page, select1V, select2V, select3V, text1, text2, text3) {
    // select 1
    await page.evaluate(async (AISelector, select1V) => {
        const buttons = document.querySelectorAll('.a-button-text.a-declarative');
        buttons[0].click()
        await new Promise(res => setTimeout(res, 5000));
        document.querySelector("#section-generative-ai > div > div.a-column.a-span2 > h4").click()
        const event = new Event('change', { bubbles: true });
        let select1 = document.querySelector(`select[name=react-aui-0]`)
        select1.value = AISelector.select1[select1V]
        select1.dispatchEvent(event)

    }, AISelector, select1V);

    await sleep(5000)

    await page.evaluate(async (AISelector, select2V) => {
        const buttons = document.querySelectorAll('.a-button-text.a-declarative');
        buttons[1].click()
        await new Promise(res => setTimeout(res, 5000));
        document.querySelector("#section-generative-ai > div > div.a-column.a-span2 > h4").click()


        const event = new Event('change', { bubbles: true });
        let select2 = document.querySelector(`select[name=react-aui-1]`)
        select2.value = AISelector.select2[select2V]
        select2.dispatchEvent(event)

    }, AISelector, select2V);

    await sleep(5000)

    await page.evaluate(async (AISelector, select3V) => {
        const buttons = document.querySelectorAll('.a-button-text.a-declarative');
        buttons[2].click()
        await new Promise(res => setTimeout(res, 5000));
        document.querySelector("#section-generative-ai > div > div.a-column.a-span2 > h4").click()

        const event = new Event('change', { bubbles: true });
        let select3 = document.querySelector(`select[name=react-aui-2]`)
        select3.value = AISelector.select3[select3V]
        select3.dispatchEvent(event)

    }, AISelector, select3V);

    await sleep(5000)


    if (select1V !== 0) {
        await page.type("input[aria-labelledby=generative-ai-questionnaire-text-tools-prompt]", text1, { delay: 80 })
        await sleep(5000)
    }

    if (select2V !== 0) {
        await page.type("input[aria-labelledby=generative-ai-questionnaire-images-tools-prompt]", text2, { delay: 80 })
        await sleep(5000)
    }

    if (select3V !== 0) {
        await page.type("input[aria-labelledby=generative-ai-questionnaire-translations-tools-prompt]", text3, { delay: 80 })
        await sleep(5000)
    }




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
    await sleep(15000)

    let subIndex = 0;
    for (const [index, category] of categoryArr.entries()) {

        let mainIndex = index
        if (mainIndex == 2) {
            mainIndex = 4
        }

        subIndex = subIndex + 2;

        if (index !== 0) {
            await page.click("#react-aui-modal-content-1 > span > div:nth-child(3) > span > span > button")
            await sleep(15000)
        }

        if (category.mainCategory !== undefined) {
            await selectCategory(page, `react-aui-${mainIndex}`, category.mainCategory)
            await sleep(15000)
        }

        if (category.mainCategory == "Non-Classifiable" ||
            category.mainCategory == "Classics" ||
            category.mainCategory == "General") {
            await selectPlacement(page, category.mainCategory)
            await sleep(15000)
        }

        if (category.subCategory !== undefined) {
            await selectCategory(page, `react-aui-${subIndex}`, category.subCategory)
            await sleep(15000)
        }

        if (category.placement !== undefined) {
            await selectPlacement(page, category.placement)
            await sleep(15000)
        }



    }

    await sleep(5000)
    await page.click("#react-aui-modal-footer-1 > span > span.a-button.a-button-primary > span > button")
    await sleep(5000)
}




async function run(data, configs) {
    const logFilePath = configs.logFile;
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
    page.setDefaultTimeout(300000 * 3);

    try {

        // login
        await page.goto("https://kdp.amazon.com/en_US/")
        await sleep(5000)
        await page.goto("https://kdp.amazon.com/bookshelf?language=en_US")
        await sleep(3000)
        await clearInput(page, "#ap_email")
        await sleep(2000)
        await typeWithRandomDelay(page, configs, "#ap_email", data.email)
        await sleep(3000)
        await page.click("#continue")
        await page.waitForSelector("#ap_password", { timeout: 20000 })
        await sleep(3000)
        await clearInput(page, "#ap_password")
        await sleep(2000)
        await typeWithRandomDelay(page, configs, "#ap_password", data.password)
        await sleep(5000)
        await page.click("#signInSubmit")
        await sleep(5000)
        await page.waitForSelector("#auth-get-new-otp-link", { timeout: 20000 })
        let typeMode = await page.$eval('#auth-mfa-form > div > div > p', el => el.innerText)
        if (!typeMode.includes("Authenticator App")) {
            // 
            await sleep(5000)
            await page.click("#auth-get-new-otp-link")
            await page.waitForSelector("input[name=otpDeviceContext]", { timeout: 20000 })
            await sleep(5000)
            await page.click(".auth-TOTP input[name=otpDeviceContext]")
            await sleep(5000)
            await page.click("#auth-send-code")

        }

        await page.waitForSelector("#auth-mfa-otpcode", { timeout: 20000 })
        await sleep(3000)
        const rawSecret = data.secret;

        // Loại bỏ dấu cách
        // const secret = rawSecret.replace(/\s+/g, '');
        let token = await getOtp(rawSecret)

        const timeStep = 30;
        const currentTime = Math.floor(Date.now() / 1000); // thời gian hiện tại tính bằng giây
        const secondsElapsed = currentTime % timeStep;
        const secondsLeft = timeStep - secondsElapsed;
        if (secondsLeft < 5) {

            await sleep(10000)
            // regenerate
            token = await getOtp(rawSecret)

        }



        await typeWithRandomDelay(page, configs, "#auth-mfa-otpcode", token)
        await page.click("#auth-signin-button")
        await sleep(10000)

    } catch (error) {

    }

    for (let book of data.books) {

        try {
            await page.goto('https://kdp.amazon.com/en_US/bookshelf');
            await sleep(randomActionTime(configs))
            let startUploadLog = `--- Upload ${book["stt"]} | Upload ${book["book title"]}  Started! ---`
            console.log(startUploadLog)
            await appendLog(logFilePath, startUploadLog)

            // 1 - Upload paperback
            await page.waitForSelector("#create-new-experience-button a")
            await sleep(5000)
            await page.click("#create-new-experience-button a")
            await page.waitForSelector("#main-0")
            await sleep(randomActionTime(configs))
            await page.click("#main-0 > div.a-row.a-spacing-extra-large > div > div > div > div.a-row.a-spacing-double-large.a-spacing-top-medium > div > div:nth-child(2) > div > span > span > button")
            await page.waitForSelector("#data-print-book-title")
            await sleep(randomActionTime(configs))


            // await page.goto('https://kdp.amazon.com/en_US/title-setup/paperback/new/details?ref_=cr_ti/');

            // Set screen size.
            // await page.setViewport({ width: 1280, height: 720 });

            // Điền book-title 
            await page.type("#data-print-book-title", book["book title"], {delay: 200})
            // await typeWithRandomDelay(page, configs, "#data-print-book-title", #data-print-book-title)
            await sleep(3000)
            const checkBookTitle = await page.$eval('#data-print-book-title', el => el.value);

            if (checkBookTitle.trim() === '') {
                // retype
                await typeWithRandomDelay(page, configs, "#data-print-book-title", book["book title"]);
            }

            await sleep(randomActionTime(configs))
            await typeWithRandomDelay(page, configs, "#data-print-book-subtitle", book["sub title"])

            await sleep(randomActionTime(configs))
            await typeWithRandomDelay(page, configs, "#data-print-book-primary-author-last-name", book["author (last name)"])
            await sleep(randomActionTime(configs))
            await sleep(5000)


            // Focus vào iframe trước
            const frameHandle = await page.$('iframe.cke_wysiwyg_frame');
            const frame = await frameHandle.contentFrame();
            // Focus vào phần body bên trong editor
            await frame.click("body");

            await sleep(5000)

            await page.$eval('#cke_editor1', (el, description) => {
                CKEDITOR.instances['editor1'].setData(description);
            }, book["description"]);
            await sleep(randomActionTime(configs))


            // Chọn non-public
            await page.click("#non-public-domain")
            await sleep(randomActionTime(configs))

            // Adult
            await page.click('#data-print-book-is-adult-content > div > div > fieldset > div:nth-child(2) > div > label > input[type=radio]') // nếu adult thì 0


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


            // keyword
            await sleep(5000)
            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-0", book["keyword1"])
            await sleep(randomActionTime(configs))

            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-1", book["keyword2"])
            await sleep(randomActionTime(configs))

            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-2", book["keyword3"])
            await sleep(randomActionTime(configs))

            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-3", book["keyword4"])
            await sleep(randomActionTime(configs))

            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-4", book["keyword5"])
            await sleep(randomActionTime(configs))

            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-5", book["keyword6"])
            await sleep(randomActionTime(configs))

            await typeWithRandomDelay(page, configs, "#data-print-book-keywords-6", book["keyword7"])



            await sleep(5000)
            await sleep(randomActionTime(configs))






            // Click save
            await page.click("#save-and-continue-announce")
            await page.waitForSelector("#section-interior", { timeout: 100000 })
            await sleep(5000)

            // Nếu low content = Yes không cần làm gì

            if (lowContent == "NO") {
                await page.click("#section-isbn-v2 .a-button-input")
                await sleep(10000)
                await sleep(randomActionTime(configs))
                await page.click("#free-isbn-confirm-button > span > input")
                await sleep(10000)
            }

            // Click Print Option

            let printOption = book["paper type"]
            await page.click(`#a-autoid-${printOption - 1}-announce`)
            await sleep(5000)
            await sleep(randomActionTime(configs))

            let trimSize = book["trim size"]
            let formatTrim = parseTrimSize(trimSize)
            if (formatTrim.w !== 6 || formatTrim.h !== 9) {
                await page.click("#trim-size-btn-announce")
                await sleep(10000)
                await page.evaluate((w, h) => {
                    const buttons = document.querySelectorAll('button.a-button-text');
                    for (const btn of buttons) {
                        if (
                            btn.dataset.width === String(w * 100) &&
                            btn.dataset.height === String(h * 100)
                        ) {
                            btn.click();
                            break;
                        }
                    }
                }, formatTrim.w, formatTrim.h);
                await sleep(10000)
            }

            let bleedSetting = book["bleed setting"];
            await sleep(randomActionTime(configs))
            await page.click(`#a-autoid-${bleedSetting + 3}-announce`)

            let paperCover = book["paperback cover"];
            await sleep(randomActionTime(configs))
            await page.click(`#a-autoid-${paperCover + 5}-announce`)

            // Manual Script Upload

            let manualScript = book["manuscript paperback"]
            const manualScriptUpload = await page.waitForSelector('#data-print-book-publisher-interior-file-upload-AjaxInput');
            await sleep(randomActionTime(configs))
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


            let AIContent = book["AI content"]
            let ai1Select = book["AI 1 select"]
            let ai2Select = book["AI 2 select"]
            let ai3Select = book["AI 3 select"]
            let ai1 = book["AI 1"]
            let ai2 = book["AI 2"]
            let ai3 = book["AI 3"]
            if (AIContent == "NO") {
                await page.click('div[data-a-accordion-row-name="no"] .a-accordion-row-a11y a')
            } else {
                await page.click('div[data-a-accordion-row-name="yes"] .a-accordion-row-a11y a')
                await sleep(5000)
                await selectAI(page, ai1Select, ai2Select, ai3Select, ai1, ai2, ai3)
            }


            // Preview 

            await sleep(10000)
            await page.waitForSelector("#print-preview-announce:not([disabled]")
            await sleep(3000)
            await sleep(randomActionTime(configs))
            // await page.click("#print-preview-announce") // not worked
            // await page.evaluate(() => {
            //     document.querySelector('#print-preview-announce').click();
            // });

            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            await sleep(5000)

            try {
                await page.click("#print-preview-noconfirm")
            } catch (error) {
                await page.evaluate(() => {
                    document.querySelector('#print-preview-noconfirm').click();
                });
            }



            try {
                // await sleep(5000000)
                await page.waitForSelector("#print-preview-confirm-button-announce", { timeout: 5000 })
                await sleep(5000)
                await page.evaluate(() => {
                    document.querySelector('#print-preview-confirm-button-announce').click();
                });

            } catch (error) {
            }


            await page.waitForSelector("#printpreview_approve_button_enabled > span", { timeout: 300000 })
            await sleep(10000)
            await sleep(randomActionTime(configs))
            await page.click("#printpreview_approve_button_enabled > span > a")
            await page.waitForSelector("#save-and-continue-announce")
            await sleep(5000)
            await sleep(randomActionTime(configs))
            await page.click("#save-and-continue-announce")



            // Price Input 

            await page.waitForSelector(".price-input")
            await sleep(10000)
            let price = book["price paperpack"].toString()
            await page.type("#data-pricing-print-us-price-input > input", price, { delay: 100 })
            await sleep(7000)
            await sleep(randomActionTime(configs))
            await page.click("#save-and-publish-announce")

            await page.waitForSelector("#publish-confirm-popover-print-start")
            await sleep(3000)



            // Ấn close để về lại màn hình
            await sleep(randomActionTime(configs))
            await page.click("#a-popover-1 > div > header > button") // ALERT: chỗ này ấn close 
            await page.waitForSelector("span[data-action=add-digital-format]")
            await sleep(5000)



            /////// Upload Kindle Book ////// 


            if (book['manuscript ebook'] !== '' && book['manuscript ebook'] !== undefined) {
                await sleep(randomActionTime(configs))
                await page.click("span[data-action=add-digital-format]")
                await page.waitForSelector("#save-and-continue-announce")
                await sleep(5000)

                // Xử lý category kindle book

                let categoryKindleBook = book["category ebooks"]
                await solveCategory(page, categoryKindleBook)

                await sleep(randomActionTime(configs))
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
                await sleep(randomActionTime(configs))
                await page.click("#data-cover-choice-accordion > div.a-box.a-last > div > div.a-accordion-row-a11y > a > i")
                await sleep(3000)
                await sleep(randomActionTime(configs))
                const ebookCoverUpload = await page.waitForSelector('#data-assets-cover-file-upload-AjaxInput');
                await ebookCoverUpload.uploadFile(coverEbook);
                await page.waitForSelector("#data-assets-cover-file-upload-success", { visible: true })
                await sleep(5000)

                // No AI 
                await sleep(randomActionTime(configs))
                await page.click("#form-main-1 > div > div:nth-child(62) > div > div.a-column.a-span10.a-span-last > div > div > div > span > div:nth-child(3) > div > div:nth-child(2) > div > div > a")
                await sleep(3000)
                await sleep(randomActionTime(configs))
                await page.click("#save-and-continue-announce")


                await page.waitForSelector(".price-input", { timeout: 300000 })
                await sleep(10000)

                //  Chỉnh giá royalty 
                await sleep(randomActionTime(configs))
                let royalty = book['Royalty Ebook']
                if (royalty == '70%' || royalty == 0.7) {
                    await page.click("#data-digital-royalty-rate > div > div > fieldset > div.a-radio.a-radio-fancy.form-submit-blacklisted.form-incr-validate-blacklist.jele-binding-disabled.unsaved-changes-ignore.a-spacing-none > label > input[type=radio]")
                }
                else {
                    await page.click("#data-digital-royalty-rate > div > div > fieldset > div.a-radio.a-radio-fancy.form-submit-blacklisted.form-incr-validate-blacklist.jele-binding-disabled.unsaved-changes-ignore.a-spacing-small > label > input[type=radio]")
                }

                await sleep(10000)
                let priceEbook = book['price_ebook'].toString()
                await page.type("#data-digital-us-price-input > input", priceEbook, { delay: randomTypeTime(configs) })
                await sleep(7000)
                await sleep(randomActionTime(configs))
                await page.click("#save-and-publish-announce")
                await sleep(randomActionTime(configs))

                await page.waitForSelector("#publish-confirm-popover-digital-done > span > input")
                await sleep(3000)
                await page.click("#a-popover-1 > div > header > button")
                await sleep(5000)
            }



            await page.goto("https://kdp.amazon.com/en_US/bookshelf")

            // Upload hardcover 
            await page.waitForSelector("span[data-action=add-hardcover-format]")
            await page.click("span[data-action=add-hardcover-format]")
            await sleep(randomActionTime(configs))
            await page.waitForSelector("#save-and-continue-announce")
            await sleep(3000)
            await page.click("#save-and-continue-announce")


            ///////////////////// Hardcover setting 

            // bleed setting for hardcover 
            await sleep(10000)
            await sleep(randomActionTime(configs))

            if (lowContent == "NO") {
                await page.click("#section-isbn-v2 .a-button-input")
                await sleep(10000)
                await sleep(randomActionTime(configs))
                await page.click("#free-isbn-confirm-button > span > input")
                await sleep(10000)
            }

            // Click Print Option

            let hardCoverPrintOption = book["paper type hardcover"];
            await page.click(`#a-autoid-${hardCoverPrintOption - 1}-announce`)
            await sleep(5000)
            await sleep(randomActionTime(configs))

            if (formatTrim.w !== 6 || formatTrim.h !== 9) {
                await page.click("#trim-size-btn")
                await sleep(10000)
                await page.evaluate((w, h) => {
                    const buttons = document.querySelectorAll('button.a-button-text');
                    for (const btn of buttons) {
                        if (
                            btn.dataset.width === String(w * 100) &&
                            btn.dataset.height === String(h * 100)
                        ) {
                            btn.click();
                            break;
                        }
                    }
                }, formatTrim.w, formatTrim.h);

                await sleep(10000)
            }

            await sleep(randomActionTime(configs))
            await page.click(`#a-autoid-${bleedSetting + 3}-announce`)




            /////////////////////////// 




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

            // AI Content
            if (AIContent == "NO") {
                await page.click('div[data-a-accordion-row-name="no"] .a-accordion-row')
                await sleep(5000)
            } else {
                await page.click('div[data-a-accordion-row-name="yes"] .a-accordion-row')
                await sleep(5000)
                await selectAI(page, ai1Select, ai2Select, ai3Select, ai1, ai2, ai3)
                await sleep(5000)
            }


            // Click Preview
            await sleep(10000)
            await page.waitForSelector("#print-preview-announce:not([disabled]")
            await sleep(3000)
            await sleep(randomActionTime(configs))
            // await page.evaluate(() => {
            //     document.querySelector('#print-preview-announce').click();
            // });

            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            await sleep(5000)

            try {
                await page.click("#print-preview-noconfirm")
            } catch (error) {
                await page.evaluate(() => {
                    document.querySelector('#print-preview-noconfirm').click();
                });
            }

            try {
                await page.waitForSelector("#print-preview-confirm-button-announce", { timeout: 5000 })
                await sleep(5000)
                await page.evaluate(() => {
                    document.querySelector('#print-preview-confirm-button-announce').click();
                });
            } catch (error) {
            }

            await page.waitForSelector("#printpreview_approve_button_enabled > span", { timeout: 300000 })
            await sleep(10000)
            await sleep(randomActionTime(configs))
            await page.click("#printpreview_approve_button_enabled > span")
            await page.waitForSelector("#save-and-continue")
            await sleep(3000)
            await sleep(randomActionTime(configs))
            await page.click("#save-and-continue")
            await page.waitForSelector(".price-input")
            await sleep(3000)
            await sleep(randomActionTime(configs))
            let hardcoverPrice = book['Price Harcover'].toString()
            await page.type("#data-pricing-print-us-price-input > input", hardcoverPrice, { delay: randomTypeTime(configs) })
            await sleep(7000)
            await sleep(randomActionTime(configs))
            await page.click("#save-and-publish-announce")
            // await page.waitForSelector("#publish-confirm-popover-hardcover-done")
            await sleep(30000)
            console.log(`--- Upload ${book["book title"]} done ---`)

            let logAppend = `--- Upload ${book["stt"]} | Upload ${book["book title"]}  OK! ---`
            await appendLog(logFilePath, logAppend)
            await sleep(randomUploadInterval(configs)) // delay các lần up
        } catch (error) {
            // const stackLine = error.stack.split('\n')[1]?.trim(); // Dòng đầu tiên trong stack trace

            let logAppend = `--- Upload ${book["stt"]} | Upload ${book["book title"]}  Failed:\n ${error.stack}`

            console.log(logAppend)
            await appendLog(logFilePath, logAppend)
        }

    }


    await sleep(10000)
    // await browser.close()

}

module.exports = { run }