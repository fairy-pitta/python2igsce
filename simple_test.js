// 直接的なテスト
const fs = require('fs');
const path = require('path');

// distディレクトリの構造を確認
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('dist directory contents:');
  console.log(fs.readdirSync(distPath));
  
  const converterPath = path.join(distPath, 'converter.js');
  if (fs.existsSync(converterPath)) {
    console.log('converter.js exists');
    try {
      const converter = require('./dist/converter');
      console.log('Converter loaded:', Object.keys(converter));
    } catch (e) {
      console.error('Error loading converter:', e.message);
    }
  } else {
    console.log('converter.js does not exist');
  }
} else {
  console.log('dist directory does not exist');
}