#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
  }

  addIssue(message) {
    this.issues.push(message);
    this.log(`✗ ${message}`, RED);
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(`⚠ ${message}`, YELLOW);
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(`✓ ${message}`, GREEN);
  }

  checkEnvFiles() {
    this.log('\n📁 Checking environment files...', BLUE);

    // Check if .env exists
    if (fs.existsSync('.env')) {
      this.addPassed('.env file found (should be in .gitignore)');

      // Verify .env is in .gitignore
      const gitignore = fs.readFileSync('.gitignore', 'utf-8');
      if (gitignore.includes('.env')) {
        this.addPassed('.env is properly listed in .gitignore');
      } else {
        this.addIssue('.env file exists but is NOT in .gitignore - CRITICAL!');
      }
    }

    // Check if .env.example exists
    if (fs.existsSync('.env.example')) {
      this.addPassed('.env.example found');

      // Verify it doesn't contain real secrets
      const envExample = fs.readFileSync('.env.example', 'utf-8');
      if (envExample.includes('your-') || envExample.includes('YOUR_') || envExample.includes('xxx')) {
        this.addPassed('.env.example contains only placeholder values');
      } else {
        this.addWarning('.env.example might contain real values - please review');
      }
    }
  }

  checkForHardcodedSecrets() {
    this.log('\n🔍 Scanning for hardcoded secrets...', BLUE);

    const patterns = [
      { name: 'Private Keys (0x...)', regex: /0x[a-fA-F0-9]{64}/, exclude: ['node_modules', 'artifacts', 'cache', 'dist', '.git'] },
      { name: 'AWS Keys', regex: /AKIA[0-9A-Z]{16}/, exclude: ['node_modules', 'artifacts', 'cache', 'dist', '.git'] },
      { name: 'Supabase URLs (hardcoded)', regex: /https:\/\/[a-z]{20}\.supabase\.co/, exclude: ['node_modules', 'artifacts', 'cache', 'dist', '.git', '.env', 'README.md'] },
      { name: 'JWT Tokens', regex: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, exclude: ['node_modules', 'artifacts', 'cache', 'dist', '.git'] }
    ];

    const sourceFiles = this.getSourceFiles(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'], ['node_modules', 'artifacts', 'cache', 'dist', '.git', 'skills/skillguard/test-fixtures']);

    for (const pattern of patterns) {
      let found = false;
      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.match(new RegExp(pattern.regex, 'g'));

        if (matches && matches.length > 0) {
          // Check if file should be excluded
          const shouldExclude = pattern.exclude.some(exc => file.includes(exc));
          if (!shouldExclude) {
            this.addWarning(`${pattern.name} pattern found in ${file}`);
            found = true;
          }
        }
      }
      if (!found) {
        this.addPassed(`No ${pattern.name} found in source code`);
      }
    }
  }

  checkGitignore() {
    this.log('\n📋 Checking .gitignore coverage...', BLUE);

    const requiredEntries = [
      '.env',
      '.env.local',
      'node_modules',
      'dist',
      '*.log',
      '.DS_Store'
    ];

    if (!fs.existsSync('.gitignore')) {
      this.addIssue('.gitignore file not found!');
      return;
    }

    const gitignore = fs.readFileSync('.gitignore', 'utf-8');

    for (const entry of requiredEntries) {
      if (gitignore.includes(entry)) {
        this.addPassed(`${entry} is in .gitignore`);
      } else if (entry === '.env.local' && gitignore.includes('*.local')) {
        this.addPassed(`${entry} is covered by *.local in .gitignore`);
      } else {
        this.addWarning(`${entry} is missing from .gitignore`);
      }
    }
  }

  checkGitStatus() {
    this.log('\n🔄 Checking git status...', BLUE);

    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      const lines = status.split('\n').filter(line => line.trim());

      const sensitiveFiles = lines.filter(line => {
        const file = line.substring(3);
        return file.includes('.env') && !file.includes('.env.example') ||
               file.includes('.pem') ||
               file.includes('.key') ||
               file.includes('secret');
      });

      if (sensitiveFiles.length > 0) {
        sensitiveFiles.forEach(file => {
          this.addIssue(`Sensitive file staged for commit: ${file}`);
        });
      } else {
        this.addPassed('No sensitive files staged for commit');
      }
    } catch (error) {
      this.addWarning('Could not check git status (not in a git repository?)');
    }
  }

  checkEnvironmentVariableUsage() {
    this.log('\n🔐 Checking environment variable usage...', BLUE);

    const sourceFiles = this.getSourceFiles(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'], ['node_modules', 'artifacts', 'cache', 'dist', '.git', 'skills/skillguard/test-fixtures']);

    let properUsage = 0;
    let improperUsage = 0;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for proper usage (process.env.VAR_NAME or import.meta.env.VAR_NAME)
      const properPatterns = [
        /process\.env\.[A-Z_]+/g,
        /import\.meta\.env\.[A-Z_]+/g
      ];

      for (const pattern of properPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          properUsage += matches.length;
        }
      }
    }

    if (properUsage > 0) {
      this.addPassed(`Found ${properUsage} proper environment variable usages`);
    }
  }

  getSourceFiles(extensions, excludeDirs = []) {
    const files = [];

    const walk = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const shouldExclude = excludeDirs.some(exc => fullPath.includes(exc));
          if (!shouldExclude) {
            walk(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    walk('.');
    return files;
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), BLUE);
    this.log('SECURITY CHECK REPORT', BLUE);
    this.log('='.repeat(60), BLUE);

    this.log(`\n✓ Passed: ${this.passed.length}`, GREEN);
    this.log(`⚠ Warnings: ${this.warnings.length}`, YELLOW);
    this.log(`✗ Issues: ${this.issues.length}`, RED);

    if (this.issues.length > 0) {
      this.log('\n' + '='.repeat(60), RED);
      this.log('CRITICAL ISSUES FOUND:', RED);
      this.log('='.repeat(60), RED);
      this.issues.forEach(issue => this.log(`  • ${issue}`, RED));
      this.log('\n❌ Security check FAILED - Please fix the issues above before pushing!', RED);
      return false;
    } else if (this.warnings.length > 0) {
      this.log('\n' + '='.repeat(60), YELLOW);
      this.log('WARNINGS:', YELLOW);
      this.log('='.repeat(60), YELLOW);
      this.warnings.forEach(warning => this.log(`  • ${warning}`, YELLOW));
      this.log('\n⚠️  Security check passed with warnings - Please review before pushing.', YELLOW);
      return true;
    } else {
      this.log('\n✅ All security checks passed! Safe to push.', GREEN);
      return true;
    }
  }

  run() {
    this.log('🔒 Running Security Check...', BLUE);
    this.log('='.repeat(60) + '\n', BLUE);

    this.checkEnvFiles();
    this.checkGitignore();
    this.checkForHardcodedSecrets();
    this.checkEnvironmentVariableUsage();
    this.checkGitStatus();

    const passed = this.generateReport();

    if (!passed) {
      process.exit(1);
    }
  }
}

const checker = new SecurityChecker();
checker.run();
