import re

with open('snippet.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's count <div and </div
lines = text.split('\n')
div_count = 0
for i, line in enumerate(lines):
    div_count += len(re.findall(r'<div', line))
    div_count -= len(re.findall(r'</div', line))
    print(f"{i + 750}: {div_count} | {line.strip()}")
