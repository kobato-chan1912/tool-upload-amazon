const Genlogin = require('./Genlogin');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(res => setTimeout(res, ms));


function processCategories(text) {
    // Remove "Books ›" from the text
    let cleanedText;
    if (text.includes("Books ›")) {
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

        if (category.mainCategory == "Non-Classifiable") {
            await selectPlacement(page, "Non-Classifiable")
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


(async () => {
    const genlogin = new Genlogin("");
    const { wsEndpoint } = await genlogin.runProfile(22415876)

    let book = {
        stt: 1,
        'book title': 'Vintage Floral Journal (Dairy, Notebook)',
        'sub title': 'Aesthetic Lined Journal | Gift for Nature & Flower Lovers | 6x9-inch - 160 pages',
        'author (last name)': 'Thinh Vuong Press',
        description: '<p>Capture your thoughts, dreams, and inspirations in this beautifully designed vintage floral notebook. Perfect for journaling, sketching, or jotting down quotes and poetry, this elegant 6x9-inch notebook offers a balance of style and functionality.</p>\r\n' +
            '\r\n' +
            '<p>• <b>Premium Lined Pages </b>– Smooth-finish, lightly lined pages work effortlessly with a variety of pens and pencils.<br>\r\n' +
            '<b>•</b> <b>High-Quality Paper</b> – Archival/acid-free paper helps preserve your writings for years to come.<br>\r\n' +
            '<b>•</b> <b>Timeless Floral Cover </b>– A stunning botanical design featuring delicate flowers in red, pink, blue, and purple hues, evoking a vintage charm.<br>\r\n' +
            '<b>•</b> <b>Elegant Embellishments</b> – Gold foil accents and subtle embossing create a textured, luxurious feel.<br>\r\n' +
            '<b>• Secure & Practical</b> – A matching elastic closure keeps your notes safe, while the back cover pocket stores mementos, notes, and keepsakes.<br>\r\n' +
            '<b>• Perfect Portable Size</b> – The 6x9-inch format fits easily into most bags, making it ideal for travel, school, or daily use.<br>\r\n' +
            '<b>• 160 Pages</b> – Ample space for journaling, goal setting, and creative writing.</p>\r\n' +
            '\r\n' +
            "<p>Whether you're a writer, dreamer, or artist, this vintage floral diary makes a thoughtful gift for flower lovers, nature enthusiasts, and those who appreciate timeless elegance.</p>\r\n" +
            '\r\n' +
            '<p><b>✓ Perfect for: Journaling | Gratitude Practice | Sketching | Note-Taking | Poetry Writing | Travel Diaries | Daily Reflections</b></p>\r\n' +
            '\r\n' +
            '<p>A beautiful blend of vintage charm and modern functionality!</p>',
        keyword1: 'Vintage floral notebook Floral journal ',
        keyword2: 'Antique Retro flower cover Aesthetic journals ',
        keyword3: 'Hardcover Softcover vintage Lined Blank page',
        keyword4: 'sketchbook Elegant print Boho Cottagecore Shabby ',
        keyword5: 'chic Victorian Romantic gratitude gift Botanical ',
        keyword6: 'planner for women Garden lovers Cute Journal',
        keyword7: 'cute Branches Butterflies Wildflower Whispers',
        adult: 'NO',
        category: 'Books › Non-Classifiable | Books › Self-Help > Journal Writing | Books › Crafts, Hobbies & Home › Crafts & Hobbies > Activity Books',
        'Low content': 'YES',
        'Large Print': 'NO',
        'paper type': 1,
        'trim size': '6x9 in',
        'bleed setting': 1,
        'AI content': 'NO',
        'paperback cover': 1,
        'manuscript paperback': '/Users/dungvietmai/Downloads/KDP/Manual\ Script/So\ 160\ trang.docx',
        'cover paperback': '/Users/dungvietmai/Downloads/KDP/Bìa\ Vintage\ Floral/Paperback/Paperback\ 160\ Vintage\ floral\ design\ \(1\).pdf',
        'price paperpack': 6.99,
        'manuscript Hard Cover': '/Users/dungvietmai/Downloads/KDP/Manual\ Script/So\ 160\ trang.docx',
        'cover Hardcover': '/Users/dungvietmai/Downloads/KDP/Bìa\ Vintage\ Floral/Hardcover/Hardcover\ 160\ Vintage\ floral\ design\ \(1\).pdf',
        'Price Harcover': 14.99,
        'category ebooks': 'Kindle Books › Non-Classifiable | Kindle Books › Self-Help > Journal Writing | Kindle Books › Classics',
        'manuscript ebook': '/Users/dungvietmai/Downloads/KDP/Manual\ Script/Demo\ -\ sửa\ lần\ 1.pdf',
        'cover ebook': '/Users/dungvietmai/Downloads/KDP/Bìa\ Vintage\ Floral/Ebook/ebook\ 1.jpg',
        price_ebook: 6.99,
        'expand distributed': true,
        'Royalty Ebook': 0.7
    }


    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        ignoreHTTPSErrors: true,
        defaultViewport: false
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(300000);


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
            console.log("CLICK")
            document.querySelector('#print-preview-confirm-button-announce').click();
            console.log("ĐÃ CLICK")
        });

    } catch (error) {
        console.log("Ko có cảnh báo: " + error)
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
    await sleep(3000)
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
        await page.type("#data-pricing-print-us-price-input > input", priceEbook, { delay: 50 })
        await sleep(3000)
        await page.click("#save-and-publish-announce")


        await page.waitForSelector("#publish-confirm-popover-digital-done > span > input")
        await sleep(3000)
        await page.click("#publish-confirm-popover-digital-done > span > input")
        await sleep(5000)
    }




    // Upload hardcover 
    await page.waitForSelector("span[data-action=add-digital-format]")
    await page.click("span[data-action=add-digital-format]")
    await page.waitForSelector("#save-and-continue-announce")
    await sleep(3000)
    await page.click("#save-and-continue-announce")


    let hardcoverScript = book['manuscript Hard Cover']
    const hardcoverUpload = await page.waitForSelector('#data-print-book-publisher-interior-file-upload-AjaxInput');
    await hardcoverUpload.uploadFile(hardcoverScript);
    await page.waitForSelector("#data-print-book-publisher-interior-file-upload-success", { visible: true })
    await sleep(5000)

    // hardcover book
    let hardcoverFile = book['manuscript Hard Cover']
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
        console.log("can click")
        await page.evaluate(() => {
            document.querySelector('#print-preview-confirm-button-announce').click();
        });
    } catch (error) {
        console.log("err: " + error)
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
    await sleep(3000)
    await page.click("#save-and-publish-announce")
    await page.waitForSelector("#publish-confirm-popover-hardcover-done")
    console.log("--- Upload done ---")
    await browser.close() // Done 


})();