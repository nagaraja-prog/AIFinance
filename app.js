const STORAGE_KEY = "expense_entries";

const entryForm = document.getElementById("entryForm");
const entriesTbody = document.getElementById("entries");
const incomeTotalEl = document.getElementById("incomeTotal");
const expenseTotalEl = document.getElementById("expenseTotal");
const balanceTotalEl = document.getElementById("balanceTotal");
const clearAllBtn = document.getElementById("clearAll");
const downloadCsvBtn = document.getElementById("downloadCsv");
const importCsvInput = document.getElementById("importCsv");

const dateInput = document.getElementById("date");
const today = new Date().toISOString().slice(0, 10);
dateInput.value = today;

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

function render() {
  const entries = loadEntries();

  entriesTbody.innerHTML = "";
  let income = 0;
  let expense = 0;

  entries.forEach((entry, index) => {
    if (entry.type === "income") {
      income += entry.amount;
    } else {
      expense += entry.amount;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.type}</td>
      <td>${entry.category}</td>
      <td>${formatAmount(entry.amount)}</td>
      <td>${entry.note || ""}</td>
      <td><button class="delete" data-index="${index}">Delete</button></td>
    `;

    entriesTbody.appendChild(row);
  });

  const balance = income - expense;
  incomeTotalEl.textContent = formatAmount(income);
  expenseTotalEl.textContent = formatAmount(expense);
  balanceTotalEl.textContent = formatAmount(balance);
}

function addEntry(data) {
  const entries = loadEntries();
  entries.push(data);
  saveEntries(entries);
  render();
}

function deleteEntry(index) {
  const entries = loadEntries();
  entries.splice(index, 1);
  saveEntries(entries);
  render();
}

function clearAll() {
  if (!confirm("Clear all entries?")) return;
  saveEntries([]);
  render();
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

  addEntry(data);
  entryForm.reset();
  document.getElementById("date").value = today;
});

entriesTbody.addEventListener("click", (event) => {
  if (!event.target.classList.contains("delete")) return;
  const index = Number(event.target.dataset.index);
  deleteEntry(index);
});

clearAllBtn.addEventListener("click", clearAll);
downloadCsvBtn.addEventListener("click", downloadCsv);

importCsvInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const imported = parseCsv(reader.result);
    const entries = loadEntries().concat(imported);
    saveEntries(entries);
    render();
  };
  reader.readAsText(file);
  importCsvInput.value = "";
});

render();
