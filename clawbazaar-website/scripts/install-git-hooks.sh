#!/bin/bash

echo "Installing git hooks..."

HOOKS_DIR=".git/hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "Creating hooks directory..."
  mkdir -p "$HOOKS_DIR"
fi

cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash

echo "Running security check before push..."

npm run security-check

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Security check failed. Push aborted."
  echo "Fix the security issues above or use 'git push --no-verify' to bypass (not recommended)."
  exit 1
fi

echo "✅ Security check passed. Proceeding with push..."
exit 0
EOF

chmod +x "$HOOKS_DIR/pre-push"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The following hooks have been installed:"
echo "  • pre-push: Runs security check before pushing to remote"
echo ""
echo "To bypass the security check (not recommended):"
echo "  git push --no-verify"
