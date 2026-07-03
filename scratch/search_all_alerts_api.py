with open(r"c:\Users\KOTHAS\Desktop\smart medistock backend\server.js", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "app.get('/api/alerts/all'" in line:
        for j in range(i, min(i+50, len(lines))):
            print(f"{j+1}: {lines[j].rstrip()}")
        break
