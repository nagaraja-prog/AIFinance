const API_URL = "https://script.google.com/a/macros/teachmint.com/s/AKfycbzS7evlKmav7GedG3oF3mCi1r1EeDsvKCV_u3Wt6QDwHnfkUOP_6gtpPMNRdNpVnO2N/exec";
const REQUEST_HEADERS = { "Content-Type": "application/json" };

const entryForm = document.getElementById("entryForm");
const entriesTbody = document.getElementById("entries");
const incomeTotalEl = document.getElementById("incomeTotal");
const expenseTotalEl = document.getElementById("expenseTotal");
const balanceTotalEl = document.getElementById("balanceTotal");
const clearAllBtn = document.getElementById("clearAll");
const downloadCsvBtn = document.getElementById("downloadCsv");
const importCsvInput = document.getElementById("importCsv");
const filterMonth = document.getElementById("filterMonth");
const filterYear = document.getElementById("filterYear");

const dateInput = document.getElementById("date");
let cachedEntries = [];
const now = new Date();
const today = now.toISOString().slice(0, 10);
if (dateInput) {
  dateInput.value = today;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEAR_RANGE = 5;

function fillMonthOptions() {
  if (!filterMonth) return;
  filterMonth.innerHTML = `<option value="">All</option>`;
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, "0");
    option.textContent = name;
    filterMonth.appendChild(option);
  });
}

function fillYearOptions(selected) {
  if (!filterYear) return;
  const currentYear = now.getFullYear();
  const startYear = currentYear - YEAR_RANGE;
  const years = [];
  for (let year = currentYear; year >= startYear; year -= 1) {
    years.push(String(year));
  }

  filterYear.innerHTML = `<option value="">All</option>`;
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    filterYear.appendChild(option);
  });

  if (selected) {
    filterYear.value = selected;
  }
}

function loadEntries() {
  return cachedEntries;
}

function saveEntries(entries) {
  cachedEntries = entries;
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

async function sendEntry(action, payload) {
  if (!API_URL || API_URL.includes("PASTE_YOUR")) {
    throw new Error("API_URL is not set.");
  }
  const response = await fetch(API_URL, {
    method: "POST",
    headers: REQUEST_HEADERS,
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) {
    throw new Error("Request failed.");
  }
  return response.json();
}

function render() {
  const entries = loadEntries();
  const selectedMonth = filterMonth ? filterMonth.value : "";
  const selectedYear = filterYear ? filterYear.value : "";
  const filtered = entries.filter((entry) => {
    const entryYear = entry.date.slice(0, 4);
    const entryMonth = entry.date.slice(5, 7);
    if (selectedYear && entryYear !== selectedYear) return false;
    if (selectedMonth && entryMonth !== selectedMonth) return false;
    return true;
  });

  if (entriesTbody) {
    entriesTbody.innerHTML = "";
  }
  let income = 0;
  let expense = 0;

  filtered.forEach((entry) => {
    if (entry.type === "income") {
      income += entry.amount;
    } else {
      expense += entry.amount;
    }

    if (entriesTbody) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.type}</td>
        <td>${entry.category}</td>
        <td>${formatAmount(entry.amount)}</td>
        <td>${entry.note || ""}</td>
        <td></td>
      `;
      entriesTbody.appendChild(row);
    }
  });

  const balance = income - expense;
  if (incomeTotalEl) incomeTotalEl.textContent = formatAmount(income);
  if (expenseTotalEl) expenseTotalEl.textContent = formatAmount(expense);
  if (balanceTotalEl) balanceTotalEl.textContent = formatAmount(balance);
  fillYearOptions(selectedYear);
}

function addEntry(data) {
  return sendEntry("add", { data }).then(() => {
    const entries = loadEntries();
    entries.push(data);
    saveEntries(entries);
    render();
  });
}

function deleteEntry(index) {
  alert("Delete is not enabled for the shared report.");
}

function clearAll() {
  if (!confirm("Clear all entries?")) return;
  sendEntry("clear", {})
    .then(() => {
      saveEntries([]);
      render();
    })
    .catch((err) => alert(err.message));
}

function downloadCsv() {
  const entries = loadEntries();
  const header = ["date", "type", "category", "amount", "note"];
  const rows = entries.map((e) => [
    e.date,
    e.type,
    e.category,
    formatAmount(e.amount),
    e.note || "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const expected = ["date", "type", "category", "amount", "note"];
  const hasHeader = expected.every((key, i) => header[i] === key);

  const startIndex = hasHeader ? 1 : 0;
  const dataLines = lines.slice(startIndex);

  return dataLines.map((line) => {
    const values = line.split(",");
    return {
      date: values[0] || today,
      type: values[1] === "income" ? "income" : "expense",
      category: values[2] || "General",
      amount: Number(values[3]) || 0,
      note: values[4] || "",
    };
  });
}

if (entryForm) {
  entryForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
      type: document.getElementById("type").value,
      date: document.getElementById("date").value || today,
      category: document.getElementById("category").value.trim() || "General",
      amount: Number(document.getElementById("amount").value),
      note: document.getElementById("note").value.trim(),
    };

    if (!data.amount || data.amount <= 0) {
      alert("Please enter a positive amount.");
      return;
    }

    addEntry(data).catch((err) => alert(err.message));
    entryForm.reset();
    document.getElementById("date").value = today;
  });
}

if (entriesTbody) {
  entriesTbody.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete")) {
      const index = Number(event.target.dataset.index);
      deleteEntry(index);
    }
  });
}

if (clearAllBtn) {
  clearAllBtn.addEventListener("click", clearAll);
}

if (downloadCsvBtn) {
  downloadCsvBtn.addEventListener("click", downloadCsv);
}

if (filterMonth) {
  filterMonth.addEventListener("change", render);
}

if (filterYear) {
  filterYear.addEventListener("change", render);
}

if (importCsvInput) {
  importCsvInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseCsv(reader.result);
      const uploads = imported.map((entry) => sendEntry("add", { data: entry }));
      Promise.all(uploads)
        .then(() => {
          const entries = loadEntries().concat(imported);
          saveEntries(entries);
          render();
        })
        .catch((err) => alert(err.message));
    };
    reader.readAsText(file);
    importCsvInput.value = "";
  });
}

if (filterMonth || filterYear) {
  fillMonthOptions();
  if (filterMonth) {
    filterMonth.value = String(now.getMonth() + 1).padStart(2, "0");
  }
  fillYearOptions(String(now.getFullYear()));
}

render();
