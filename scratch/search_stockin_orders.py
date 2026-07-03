with open(r"c:\Users\KOTHAS\Desktop\smart medistock backend\public\StockinManager.html", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "function loadOrders(" in line or "function renderOrdersTable(" in line:
        for j in range(i, min(i+100, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
