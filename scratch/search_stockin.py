with open(r"c:\Users\KOTHAS\Desktop\smart medistock backend\public\StockinManager.html", "r", encoding="utf-8") as f:
    for i, line in enumerate(f):
        if "fetch" in line or "/api" in line or "alert" in line.lower():
            if len(line.strip()) < 150:
                print(f"Line {i+1}: {line.strip()}")
