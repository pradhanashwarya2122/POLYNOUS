
import os
import glob

old = "claude-3-5-haiku-20241022"
new = "claude-haiku-4-5"

count = 0
for root, dirs, files in os.walk("app"):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if old in content:
                content = content.replace(old, new)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"✅ Fixed: {path}")
                count += 1

print(f"\n🎉 Replaced '{old}' with '{new}' in {count} files.")