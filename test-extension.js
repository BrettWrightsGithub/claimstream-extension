// Simple test script to validate extension structure
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ClaimStream Extension Structure...\n');

const requiredFiles = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'content.js',
  'background.js',
  'README.md'
];

const optionalFiles = [
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png'
];

let allTestsPassed = true;

// Test required files
console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allTestsPassed = false;
  }
});

// Test optional files
console.log('\n📁 Checking optional files:');
optionalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`⚠️  ${file} - Not found (optional)`);
  }
});

// Validate manifest.json
console.log('\n📋 Validating manifest.json:');
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  const requiredFields = ['manifest_version', 'name', 'version', 'permissions'];
  requiredFields.forEach(field => {
    if (manifest[field]) {
      console.log(`✅ ${field}: ${JSON.stringify(manifest[field])}`);
    } else {
      console.log(`❌ ${field} - MISSING`);
      allTestsPassed = false;
    }
  });
  
  if (manifest.manifest_version === 3) {
    console.log('✅ Using Manifest V3');
  } else {
    console.log('❌ Should use Manifest V3');
    allTestsPassed = false;
  }
  
} catch (error) {
  console.log(`❌ Error parsing manifest.json: ${error.message}`);
  allTestsPassed = false;
}

// Test file sizes
console.log('\n📊 File sizes:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`📄 ${file}: ${stats.size} bytes`);
  }
});

console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 All tests passed! Extension structure is valid.');
  console.log('\n📝 Next steps:');
  console.log('1. Load extension in Chrome (chrome://extensions/)');
  console.log('2. Test on YouTube videos');
  console.log('3. Add proper icons');
  console.log('4. Integrate with Supabase');
} else {
  console.log('❌ Some tests failed. Please fix the issues above.');
}
console.log('='.repeat(50));
