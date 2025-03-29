const xlsx = require("xlsx");

function readExcelFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
    const worksheet = workbook.Sheets[sheetName];

    // Chuyển dữ liệu sang mảng object (mỗi hàng là một object)
    const data = xlsx.utils.sheet_to_json(worksheet);

    return data;
}

module.exports = { readExcelFile }