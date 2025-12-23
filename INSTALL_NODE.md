# Installing Node.js

Since Node.js is not currently installed, you have a few options:

## Option 1: Download Official Installer (Easiest)
1. Visit: https://nodejs.org/
2. Download the LTS version for macOS
3. Run the installer
4. Restart your terminal

## Option 2: Using Cursor's Terminal
Cursor may have Node.js available. Try:
1. Open a new terminal in Cursor
2. Type: `node --version`
3. If it works, you're all set!

## Option 3: Using nvm (Node Version Manager)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc
nvm install --lts
nvm use --lts
```

After installing Node.js, run:
```bash
npm run install-all
npm run dev
```

