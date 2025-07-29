#!/usr/bin/env node

// Test runner script for ClaimStream extension tests
const { spawn } = require('child_process');
const path = require('path');

const testTypes = {
  unit: 'unit tests',
  integration: 'integration tests',
  e2e: 'end-to-end tests',
  all: 'all tests'
};

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: __dirname,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function installDependencies() {
  console.log('📦 Installing test dependencies...');
  try {
    await runCommand('npm', ['install']);
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

async function runTests(testType = 'all') {
  console.log(`\n🧪 Running ${testTypes[testType] || 'tests'}...`);
  
  const args = ['test'];
  
  switch (testType) {
    case 'unit':
      args.push('--testPathPattern=unit');
      break;
    case 'integration':
      args.push('--testPathPattern=integration');
      break;
    case 'e2e':
      args.push('--testPathPattern=e2e');
      break;
    case 'coverage':
      args.push('--coverage');
      break;
    case 'watch':
      args.push('--watch');
      break;
  }

  try {
    await runCommand('npm', args);
    console.log(`\n✅ ${testTypes[testType] || 'Tests'} completed successfully!`);
  } catch (error) {
    console.error(`\n❌ ${testTypes[testType] || 'Tests'} failed:`, error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  console.log('🔧 ClaimStream Extension Test Runner');
  console.log('=====================================');
  
  // Check if dependencies are installed
  const fs = require('fs');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    await installDependencies();
  }
  
  // Run tests
  await runTests(testType);
  
  console.log('\n🎉 All done!');
}

// Handle command line arguments
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests, installDependencies };
