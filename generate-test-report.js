#!/usr/bin/env node

/**
 * Python2IGCSE テストレポート生成スクリプト
 * 
 * このスクリプトはPlaywrightのテスト結果を解析し、
 * サマリーレポートを生成します。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 設定
const PLAYWRIGHT_REPORT_DIR = path.join(__dirname, 'playwright-report');
const REPORT_OUTPUT_FILE = path.join(__dirname, 'test-report-summary.md');

// 色の定義（コンソール出力用）
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * テスト結果を解析する関数
 */
async function analyzeTestResults() {
  try {
    // テスト結果JSONファイルを探す
    const resultsDir = path.join(PLAYWRIGHT_REPORT_DIR, 'data');
    if (!fs.existsSync(resultsDir)) {
      throw new Error(`テスト結果ディレクトリが見つかりません: ${resultsDir}`);
    }
    
    // 最新のテスト結果ファイルを取得
    const files = fs.readdirSync(resultsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.join(resultsDir, file));
    
    if (files.length === 0) {
      throw new Error('テスト結果ファイルが見つかりません');
    }
    
    // 最新のファイルを取得（ファイル名でソート）
    const latestFile = files.sort().pop();
    const testResults = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    
    // 結果の集計
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      duration: 0,
      browsers: {},
      specs: {},
    };
    
    // テスト結果を解析
    testResults.suites.forEach(suite => {
      processSuite(suite, summary);
    });
    
    // 合計時間を計算（ミリ秒からの変換）
    summary.duration = Math.round(summary.duration / 1000);
    
    return summary;
  } catch (error) {
    console.error(`${colors.red}エラー:${colors.reset} ${error.message}`);
    return null;
  }
}

/**
 * テストスイートを再帰的に処理する関数
 */
function processSuite(suite, summary) {
  // スイート内のテストを処理
  if (suite.specs) {
    suite.specs.forEach(spec => {
      summary.total++;
      
      // テスト結果を集計
      const testFile = spec.file || 'unknown';
      if (!summary.specs[testFile]) {
        summary.specs[testFile] = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
      }
      
      summary.specs[testFile].total++;
      
      // テストの各実行結果を処理
      spec.tests.forEach(test => {
        test.results.forEach(result => {
          // ブラウザ情報を集計
          const browser = result.attachments.find(a => a.name === 'browser')?.body || 'unknown';
          if (!summary.browsers[browser]) {
            summary.browsers[browser] = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
          }
          summary.browsers[browser].total++;
          
          // テスト時間を集計
          summary.duration += result.duration;
          
          // テスト結果を集計
          if (result.status === 'passed') {
            summary.passed++;
            summary.specs[testFile].passed++;
            summary.browsers[browser].passed++;
          } else if (result.status === 'failed') {
            summary.failed++;
            summary.specs[testFile].failed++;
            summary.browsers[browser].failed++;
          } else if (result.status === 'skipped') {
            summary.skipped++;
            summary.specs[testFile].skipped++;
            summary.browsers[browser].skipped++;
          } else if (result.status === 'flaky') {
            summary.flaky++;
            summary.specs[testFile].flaky++;
            summary.browsers[browser].flaky++;
          }
        });
      });
    });
  }
  
  // 子スイートを再帰的に処理
  if (suite.suites) {
    suite.suites.forEach(childSuite => {
      processSuite(childSuite, summary);
    });
  }
}

/**
 * マークダウンレポートを生成する関数
 */
function generateMarkdownReport(summary) {
  if (!summary) return null;
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  
  let md = `# Python2IGCSE テスト実行レポート

`;
  md += `**実行日時:** ${dateStr} ${timeStr}\n\n`;
  
  // 概要セクション
  md += `## テスト概要

`;
  md += `- **合計テスト数:** ${summary.total}\n`;
  md += `- **成功:** ${summary.passed} (${Math.round(summary.passed / summary.total * 100)}%)\n`;
  md += `- **失敗:** ${summary.failed} (${Math.round(summary.failed / summary.total * 100)}%)\n`;
  md += `- **スキップ:** ${summary.skipped}\n`;
  md += `- **不安定:** ${summary.flaky}\n`;
  md += `- **実行時間:** ${summary.duration} 秒\n\n`;
  
  // ブラウザ別の結果
  md += `## ブラウザ別の結果

`;
  md += `| ブラウザ | 合計 | 成功 | 失敗 | スキップ | 不安定 |\n`;
  md += `|---------|------|------|------|----------|--------|\n`;
  
  Object.keys(summary.browsers).forEach(browser => {
    const stats = summary.browsers[browser];
    md += `| ${browser} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${stats.skipped} | ${stats.flaky} |\n`;
  });
  
  md += '\n';
  
  // ファイル別の結果
  md += `## ファイル別の結果

`;
  md += `| テストファイル | 合計 | 成功 | 失敗 | スキップ | 不安定 |\n`;
  md += `|--------------|------|------|------|----------|--------|\n`;
  
  Object.keys(summary.specs).forEach(file => {
    const stats = summary.specs[file];
    const shortFile = path.basename(file);
    md += `| ${shortFile} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${stats.skipped} | ${stats.flaky} |\n`;
  });
  
  md += '\n';
  
  // レポートへのリンク
  md += `## 詳細レポート

`;
  md += `詳細なテスト結果は [Playwright HTML レポート](./playwright-report/index.html) で確認できます。\n\n`;
  
  return md;
}

/**
 * コンソールにカラー出力する関数
 */
function printColoredSummary(summary) {
  if (!summary) return;
  
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.cyan}Python2IGCSE テスト実行レポート${colors.reset}`);
  console.log('='.repeat(50));
  
  console.log(`\n${colors.white}テスト概要:${colors.reset}`);
  console.log(`合計テスト数: ${summary.total}`);
  console.log(`成功: ${colors.green}${summary.passed}${colors.reset} (${Math.round(summary.passed / summary.total * 100)}%)`);
  console.log(`失敗: ${colors.red}${summary.failed}${colors.reset} (${Math.round(summary.failed / summary.total * 100)}%)`);
  console.log(`スキップ: ${colors.yellow}${summary.skipped}${colors.reset}`);
  console.log(`不安定: ${colors.magenta}${summary.flaky}${colors.reset}`);
  console.log(`実行時間: ${summary.duration} 秒`);
  
  console.log(`\n${colors.white}ブラウザ別の結果:${colors.reset}`);
  Object.keys(summary.browsers).forEach(browser => {
    const stats = summary.browsers[browser];
    console.log(`- ${browser}: ${colors.green}${stats.passed}${colors.reset} 成功 / ${colors.red}${stats.failed}${colors.reset} 失敗`);
  });
  
  console.log(`\n${colors.white}レポート:${colors.reset}`);
  console.log(`詳細レポートが生成されました: ${colors.cyan}${REPORT_OUTPUT_FILE}${colors.reset}`);
  console.log(`HTML レポート: ${colors.cyan}${path.join(PLAYWRIGHT_REPORT_DIR, 'index.html')}${colors.reset}`);
  
  console.log('\n' + '='.repeat(50) + '\n');
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log(`${colors.cyan}テスト結果を解析中...${colors.reset}`);
    
    // テスト結果を解析
    const summary = await analyzeTestResults();
    if (!summary) {
      console.log(`${colors.yellow}警告:${colors.reset} テスト結果が見つかりませんでした。`);
      console.log(`テストを実行してから再度試してください: ${colors.green}npm run test:e2e${colors.reset}`);
      process.exit(1);
    }
    
    // マークダウンレポートを生成
    const markdownReport = generateMarkdownReport(summary);
    fs.writeFileSync(REPORT_OUTPUT_FILE, markdownReport);
    
    // コンソールに結果を表示
    printColoredSummary(summary);
    
    // 終了コードを設定
    process.exit(summary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(`${colors.red}エラー:${colors.reset} ${error.message}`);
    process.exit(1);
  }
}

// スクリプト実行
main();