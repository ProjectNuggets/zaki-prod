#!/bin/bash
# ZAKI Design Token Migration Script
# Replaces hardcoded colors with design token classes

cd "$(dirname "$0")/.."

# Text colors
find src -name "*.tsx" -exec sed -i '' \
  -e 's/text-\[#1f1a14\]/text-zaki-primary/g' \
  -e 's/text-\[#655543\]/text-zaki-secondary/g' \
  -e 's/text-\[#88735A\]/text-zaki-muted/g' \
  -e 's/text-\[#88735a\]/text-zaki-muted/g' \
  -e 's/text-\[#a3a3a3\]/text-zaki-disabled/g' \
  -e 's/text-\[#b09472\]/text-zaki-muted/g' \
  -e 's/text-\[#B09472\]/text-zaki-muted/g' \
  -e 's/text-\[#D24430\]/text-zaki-brand/g' \
  -e 's/text-\[#d24430\]/text-zaki-brand/g' \
  {} \;

# Background colors  
find src -name "*.tsx" -exec sed -i '' \
  -e 's/bg-\[#faf6f0\]/bg-zaki-elevated/g' \
  -e 's/bg-\[#f6efe6\]/bg-zaki-sunken/g' \
  -e 's/bg-\[#f8f2e9\]/bg-zaki-hover/g' \
  -e 's/bg-\[#F8F2E9\]/bg-zaki-hover/g' \
  -e 's/bg-\[#fffdfa\]/bg-zaki-raised/g' \
  -e 's/bg-\[#fff4e8\]/bg-zaki-selected/g' \
  -e 's/bg-\[#EADBC8\]/bg-zaki-bubble-user/g' \
  -e 's/bg-\[#D24430\]/bg-zaki-brand/g' \
  -e 's/bg-\[#fff3f0\]/bg-zaki-error/g' \
  -e 's/bg-\[#c2f5da\]/bg-zaki-success/g' \
  {} \;

# Hover states
find src -name "*.tsx" -exec sed -i '' \
  -e 's/hover:bg-\[#f8f2e9\]/hover:bg-zaki-hover/g' \
  -e 's/hover:bg-\[#F8F2E9\]/hover:bg-zaki-hover/g' \
  -e 's/hover:bg-\[#f0e6d8\]/hover:bg-zaki-active/g' \
  -e 's/hover:bg-\[#fff3f0\]/hover:bg-zaki-error/g' \
  {} \;

# Border colors
find src -name "*.tsx" -exec sed -i '' \
  -e 's/border-\[#efe4d6\]/border-zaki/g' \
  -e 's/border-\[#EBEBEB\]/border-zaki-subtle/g' \
  -e 's/border-\[#ebebeb\]/border-zaki-subtle/g' \
  -e 's/border-\[#e7dbc9\]/border-zaki-strong/g' \
  -e 's/border-\[#f3e5d4\]/border-zaki/g' \
  -e 's/border-\[#f1ece3\]/border-zaki/g' \
  -e 's/border-\[#e9dfd2\]/border-zaki/g' \
  -e 's/border-\[#ebe3d6\]/border-zaki/g' \
  {} \;

# Focus ring
find src -name "*.tsx" -exec sed -i '' \
  -e 's/focus-visible:ring-\[#D24430\]/focus-visible:ring-zaki-brand/g' \
  {} \;

# Border radius
find src -name "*.tsx" -exec sed -i '' \
  -e 's/rounded-xl/rounded-zaki-md/g' \
  -e 's/rounded-2xl/rounded-zaki-lg/g' \
  -e 's/rounded-3xl/rounded-zaki-2xl/g' \
  {} \;

echo "Migration complete! Review changes with: git diff"
