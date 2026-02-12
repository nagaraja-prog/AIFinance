import csv
import os
from datetime import datetime

DATA_DIR = "data"
CSV_PATH = os.path.join(DATA_DIR, "transactions.csv")
HEADERS = ["date", "type", "category", "amount", "note"]


def ensure_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(CSV_PATH):
        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(HEADERS)


def prompt_amount():
    while True:
        raw = input("Amount: ").strip()
        try:
            amount = float(raw)
            if amount <= 0:
                print("Enter a positive number.")
                continue
            return round(amount, 2)
        except ValueError:
            print("Enter a valid number (e.g., 12.50).")


def prompt_date():
    today = datetime.now().date().isoformat()
    raw = input(f"Date (YYYY-MM-DD) [default {today}]: ").strip()
    if not raw:
        return today
    try:
        datetime.strptime(raw, "%Y-%m-%d")
        return raw
    except ValueError:
        print("Invalid date, using today.")
        return today


def add_entry(entry_type):
    date = prompt_date()
    category = input("Category: ").strip() or "General"
    amount = prompt_amount()
    note = input("Note (optional): ").strip()

    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([date, entry_type, category, f"{amount:.2f}", note])

    print(f"Saved {entry_type}: {amount:.2f}")


def read_entries():
    entries = []
    with open(CSV_PATH, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                row["amount"] = float(row["amount"])
            except ValueError:
                row["amount"] = 0.0
            entries.append(row)
    return entries


def show_totals():
    entries = read_entries()
    income = sum(e["amount"] for e in entries if e["type"] == "income")
    expense = sum(e["amount"] for e in entries if e["type"] == "expense")
    balance = income - expense

    print("\nTotals")
    print(f"Income : {income:.2f}")
    print(f"Expense: {expense:.2f}")
    print(f"Balance: {balance:.2f}\n")


def list_recent():
    entries = read_entries()
    if not entries:
        print("No entries yet.")
        return

    raw = input("How many recent entries to show? [default 5]: ").strip()
    try:
        n = int(raw) if raw else 5
    except ValueError:
        n = 5

    print("\nRecent Entries")
    for e in entries[-n:]:
        print(f"{e['date']} | {e['type']:<7} | {e['category']:<12} | {e['amount']:.2f} | {e['note']}")
    print("")


def main():
    ensure_storage()

    while True:
        print("Personal Expense Tracker")
        print("1. Add Income")
        print("2. Add Expense")
        print("3. Show Totals")
        print("4. List Recent Entries")
        print("5. Exit")

        choice = input("Choose an option: ").strip()
        if choice == "1":
            add_entry("income")
        elif choice == "2":
            add_entry("expense")
        elif choice == "3":
            show_totals()
        elif choice == "4":
            list_recent()
        elif choice == "5":
            print("Goodbye.")
            break
        else:
            print("Invalid choice. Try again.\n")


if __name__ == "__main__":
    main()
