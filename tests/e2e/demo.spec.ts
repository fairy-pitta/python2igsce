import { test, expect } from '@playwright/test';

test.describe('Python2IGCSE Demo Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/index.html');
  });

  test('should load the demo page correctly', async ({ page }) => {
    // ページタイトルの確認
    await expect(page).toHaveTitle(/Python to IGCSE Pseudocode Converter - Demo/);
    
    // 主要な要素の存在確認
    await expect(page.locator('h1')).toContainText('Python → IGCSE Pseudocode');
    await expect(page.locator('#pythonInput')).toBeVisible();
    await expect(page.locator('#output')).toBeVisible();
    await expect(page.locator('#convertBtn')).toBeVisible();
  });

  test('should convert simple Python code to IGCSE pseudocode', async ({ page }) => {
    // シンプルなPythonコードを入力
    const pythonCode = 'print("Hello, World!")';
    await page.fill('#pythonInput', pythonCode);
    
    // 変換ボタンをクリック
    await page.click('#convertBtn');
    
    // 出力エリアに結果が表示されることを確認
    await expect(page.locator('#output')).not.toHaveText('変換結果がここに表示されます...');
    
    // 出力にOUTPUTが含まれることを確認
    const output = await page.locator('#output').textContent();
    expect(output).toContain('OUTPUT');
  });

  test('should handle example code buttons', async ({ page }) => {
    // 基本構文ボタンをクリック
    await page.click('.example-btn[data-example="basic"]');
    
    // 入力エリアにサンプルコードが設定されることを確認
    const inputValue = await page.locator('#pythonInput').inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
    expect(inputValue).toContain('print');
    
    // 変換ボタンをクリック
    await page.click('#convertBtn');
    
    // 出力が生成されることを確認
    await expect(page.locator('#output')).not.toHaveText('変換結果がここに表示されます...');
  });

  test('should not show "Python2IGCSE is not a constructor" error', async ({ page }) => {
    // コンソールエラーをキャプチャするための配列
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // シンプルなPythonコードを入力
    const pythonCode = 'print("Hello, World!")';
    await page.fill('#pythonInput', pythonCode);
    
    // 変換ボタンをクリック
    await page.click('#convertBtn');
    
    // 少し待機してエラーが発生する時間を与える
    await page.waitForTimeout(1000);
    
    // 「Python2IGCSE is not a constructor」エラーが発生していないことを確認
    const hasConstructorError = errors.some(error => 
      error.includes('Python2IGCSE is not a constructor'));
    expect(hasConstructorError).toBe(false);
    
    // 出力エリアにエラーメッセージが表示されていないことを確認
    const output = await page.locator('#output').textContent();
    expect(output).not.toContain('Python2IGCSE is not a constructor');
  });

  test('should handle invalid Python code gracefully', async ({ page }) => {
    // 無効なPythonコードを入力
    const invalidCode = 'print("Hello, World!"';
    await page.fill('#pythonInput', invalidCode);
    
    // 変換ボタンをクリック
    await page.click('#convertBtn');
    
    // エラーメッセージが表示されることを確認
    const output = await page.locator('#output').textContent();
    expect(output).toContain('エラー');
    
    // ステータスメッセージが表示されることを確認
    await expect(page.locator('#status')).toBeVisible();
    await expect(page.locator('#status')).toHaveClass(/error/);
  });
});