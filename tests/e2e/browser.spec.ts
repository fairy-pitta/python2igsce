import { test, expect } from '@playwright/test';

test.describe('Python2IGCSE Browser Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-browser.html');
  });

  test('should load the demo page correctly', async ({ page }) => {
    // ページタイトルの確認
    await expect(page).toHaveTitle(/Python to IGCSE Converter - Browser Test/);
    
    // 主要な要素の存在確認
    await expect(page.locator('h1')).toContainText('🐍➡️📝 Python to IGCSE Pseudocode Converter');
    await expect(page.locator('#pythonInput')).toBeVisible();
    await expect(page.locator('#output')).toBeVisible();
    await expect(page.locator('button:has-text("Convert to IGCSE")')).toBeVisible();
  });

  test('should convert simple Python code to IGCSE pseudocode', async ({ page }) => {
    // シンプルなPythonコードを入力
    const pythonCode = 'print("Hello, World!")';
    await page.fill('#pythonInput', pythonCode);
    
    // 変換ボタンをクリック
    await page.click('button:has-text("Convert to IGCSE")');
    
    // 出力エリアに結果が表示されることを確認
    await expect(page.locator('#output')).not.toHaveText('Click "Convert to IGCSE" to see the pseudocode output here...');
    
    // 出力にOUTPUTが含まれることを確認
    const output = await page.locator('#output').textContent();
    expect(output).toContain('OUTPUT');
  });

  test('should handle example code buttons', async ({ page }) => {
    // Hello Worldボタンをクリック
    await page.click('button:has-text("Hello World")');
    
    // 入力エリアにサンプルコードが設定されることを確認
    const inputValue = await page.locator('#pythonInput').inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
    expect(inputValue).toContain('print');
    
    // 変換ボタンをクリック
    await page.click('button:has-text("Convert to IGCSE")');
    
    // 出力が生成されることを確認
    await expect(page.locator('#output')).not.toHaveText('Click "Convert to IGCSE" to see the pseudocode output here...');
  });

  test('should show error for invalid Python code', async ({ page }) => {
    // 無効なPythonコードを入力
    const invalidCode = 'print("unclosed string';
    await page.fill('#pythonInput', invalidCode);
    
    // 変換ボタンをクリック
    await page.click('button:has-text("Convert to IGCSE")');
    
    // エラーメッセージが表示されることを確認
    const output = await page.locator('#output').textContent();
    expect(output).toContain('Error');
  });

  test('should clear input and output when clear button is clicked', async ({ page }) => {
    // コードを入力して変換
    await page.fill('#pythonInput', 'print("test")');
    await page.click('button:has-text("Convert to IGCSE")');
    
    // 入力と出力が空でないことを確認
    await expect(page.locator('#pythonInput')).not.toHaveValue('');
    await expect(page.locator('#output')).not.toHaveText('Click "Convert to IGCSE" to see the pseudocode output here...');
    
    // クリアボタンをクリック
    await page.click('button:has-text("Clear All")');
    
    // 入力と出力がクリアされることを確認
    await expect(page.locator('#pythonInput')).toHaveValue('');
    await expect(page.locator('#output')).toHaveText('Click "Convert to IGCSE" to see the pseudocode output here...');
  });

  test('should handle validation functionality', async ({ page }) => {
    // バリデーション機能のテスト
    const validCode = 'print("Hello")';
    await page.fill('#pythonInput', validCode);
    
    // バリデーションボタンをクリック
    await page.click('button:has-text("Validate Syntax")');
    
    // バリデーション結果が表示されることを確認
    const output = await page.locator('#output').textContent();
    expect(output).toContain('valid');
  });

  test('should validate library is loaded correctly', async ({ page }) => {
    // ブラウザのコンソールでライブラリが正しく読み込まれていることを確認
    const libraryLoaded = await page.evaluate(() => {
      return typeof (window as any).Python2IGCSEBrowser !== 'undefined';
    });
    
    expect(libraryLoaded).toBe(true);
  });

  test('should handle different conversion options', async ({ page }) => {
    // If Statementサンプルを使用
    await page.click('button:has-text("If Statement")');
    
    // 変換実行
    await page.click('button:has-text("Convert to IGCSE")');
    
    // 出力が生成されることを確認
    const output = await page.locator('#output').textContent();
    expect(output).toContain('IF');
    expect(output).toContain('OUTPUT');
  });

  test('should display conversion stats', async ({ page }) => {
    // コードを入力して変換
    await page.fill('#pythonInput', 'print("Hello")');
    await page.click('button:has-text("Convert to IGCSE")');
    
    // 統計情報が表示されることを確認
    await expect(page.locator('#stats')).toBeVisible();
    const stats = await page.locator('#stats').textContent();
    expect(stats).toContain('Conversion Stats');
    expect(stats).toContain('Time');
  });

  test('should handle all example buttons', async ({ page }) => {
    const examples = ['Hello World', 'If Statement', 'For Loop', 'Function'];
    
    for (const example of examples) {
      // サンプルボタンをクリック
      await page.click(`button:has-text("${example}")`);
      
      // 入力エリアにコードが設定されることを確認
      const inputValue = await page.locator('#pythonInput').inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
      
      // 変換実行
      await page.click('button:has-text("Convert to IGCSE")');
      
      // 出力が生成されることを確認
      await expect(page.locator('#output')).not.toHaveText('Click "Convert to IGCSE" to see the pseudocode output here...');
    }
  });
});