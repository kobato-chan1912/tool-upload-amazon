const path = require('path')
const fs = require('fs')
const fsPromise = require('fs').promises
const $ = require('jquery')
const { ipcRenderer, webUtils } = require('electron');
const excel = require("./excel.js")
const { exec } = require('child_process');

function getFilePath(id) {
    if ($("#" + id)[0].files.length === 0) {
        return null
    } else {
        return webUtils.getPathForFile($("#" + id)[0].files[0]);
    }
}

function runNodeFile() {
    const nodeFilePath = path.join(__dirname, 'run.js');

    // Platform-specific commands
    let command;
    if (process.platform === 'darwin') {
        command = `osascript -e 'tell application "Terminal" to do script "node \\"${nodeFilePath}\\""'`;
    } else if (process.platform === 'win32') {
        command = `start cmd.exe /K "node ${nodeFilePath}"`;
    } else {
        command = `x-terminal-emulator -e "node \\"${nodeFilePath}\\""`;
    }

    console.log(command);
    exec(command);
}


async function loadAccount() {
    let accountPath = getFilePath("account_file");
    let accountData = excel.readExcelFile(accountPath);

    // Hiển thị danh sách tài khoản trong list_accounts
    let listAccountsDiv = document.getElementById("list_accounts");
    listAccountsDiv.innerHTML = ""; // Xóa dữ liệu cũ trước khi render mới

    let rowDiv;
    accountData.forEach((account, index) => {
        if (index % 3 === 0) {
            // Cứ 3 tài khoản tạo một dòng mới
            rowDiv = document.createElement("div");
            rowDiv.className = "row mb-2";
            listAccountsDiv.appendChild(rowDiv);
        }

        let colDiv = document.createElement("div");
        colDiv.className = "col-md-4"; // Chia 3 cột mỗi hàng

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "form-check-input me-2";
        checkbox.checked = true; // Mặc định chọn hết
        checkbox.value = account["tài khoản"]; // Lưu email

        let label = document.createElement("label");
        label.className = "form-check-label";
        label.textContent = account["tài khoản"];

        let formCheckDiv = document.createElement("div");
        formCheckDiv.className = "form-check";
        formCheckDiv.appendChild(checkbox);
        formCheckDiv.appendChild(label);

        colDiv.appendChild(formCheckDiv);
        rowDiv.appendChild(colDiv);
    });

    // Lưu dữ liệu account vào biến toàn cục để dùng khi lưu kết quả
    window.loadedAccounts = accountData;
    $("#run_btn").show()
}

async function saveSelectedAccounts() {
    let selectedEmails = Array.from(document.querySelectorAll("#list_accounts input[type=checkbox]:checked"))
        .map(cb => cb.value); // Lấy email của những checkbox được tick

    let selectedAccounts = window.loadedAccounts.filter(acc => selectedEmails.includes(acc["tài khoản"]));

    let booksPath = getFilePath("data_file");
    let booksData = excel.readExcelFile(booksPath);

    let resultFilter = selectedAccounts.map(account => ({
        email: account["tài khoản"],
        gpm_id: account.gpm_id,
        password: account["mật khẩu"],
        secret: account["2FA"],
        books: booksData.filter(item => item.email === account["tài khoản"])
    }));

    let logFileName = `log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;

    let logFilePath;
    if (process.platform === 'win32') {
        logFilePath = path.join("logs/" + logFileName); // built
    } else {
        logFilePath = path.join(__dirname, "logs/" + logFileName); // not built
    }

    let configs = {
        accountsFile: getFilePath("account_file"),
        booksFile: booksPath,
        data: resultFilter,
        threads: parseInt(document.getElementById("threads").value) || 1,
        typingTime: {
            min: Number(document.getElementById("typing_min").value) || 0,
            max: Number(document.getElementById("typing_max").value) || 0
        },
        actionTime: {
            min: Number(document.getElementById("action_min").value) || 0,
            max: Number(document.getElementById("action_max").value) || 0
        },
        uploadInterval: {
            min: Number(document.getElementById("upload_min").value) || 0,
            max: Number(document.getElementById("upload_max").value) || 0
        },
        logFile: logFilePath

    }

    let savePath = path.join(__dirname, "configs.json");
    await fsPromise.writeFile(savePath, JSON.stringify(configs, null, 2), "utf-8");
    runNodeFile()


}
