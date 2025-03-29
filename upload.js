const Genlogin = require('./Genlogin');
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(res => setTimeout(res, ms));


function processCategories(text) {
    // Remove "Books ›" from the text
    const cleanedText = text.replace(/Books ›/g, '');

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

}


async function run (profileID, booksData) {
    const genlogin = new Genlogin("");
    const { wsEndpoint } = await genlogin.runProfile(profileID)

    const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        ignoreHTTPSErrors: true,
        defaultViewport: false
    });

    for (let book in booksData) {

        const page = await browser.newPage();
        page.setDefaultTimeout(300000);


        await page.goto('https://google.com');

        // Set screen size.
        await page.setViewport({ width: 1280, height: 720 });

        await sleep(20000)
        console.log("--- Upload done ---")

    }

    await browser.close() // Done 

}

module.exports = { run }