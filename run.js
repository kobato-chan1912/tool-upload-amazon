const fs = require('fs').promises;
const path = require('path');
const pLimit = require('p-limit');
const upload = require('./upload.js'); // Import file upload.js


async function run() {
    try {
        console.log(" -- Để tắt tool ấn ctrl + c -- \n")
        // 1️⃣ Đọc file configs.json
        let configPath = path.join(__dirname, 'configs.json');
        let rawData = await fs.readFile(configPath, 'utf-8');
        let configs = JSON.parse(rawData);

        // 2️⃣ Lấy ra trường `data`
        let { data } = configs;

        if (!data || data.length === 0) {
            console.log("Không có dữ liệu để upload.");
            return;
        }

        // 3️⃣ Sử dụng p-limit để chạy đa luồng
        let limit = pLimit(data.length); // Số luồng = số phần tử trong `data`

        let uploadTasks = data.map(account =>
            limit(() => upload.run(account, configs))
        );

        // 4️⃣ Đợi tất cả hoàn thành
        await Promise.all(uploadTasks);

        // 5️⃣ Hoàn thành
        console.log("✅ Đã xong");

    } catch (error) {
        console.error("❌ Lỗi trong quá trình chạy:", error);
    }
}

run();
