import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Pyodideのテストを除外（Node.js環境では動作しないため）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/parser/pyodide-ast-parser.test.ts'
    ],
  },
  define: {
    // Node.js環境でのPyodide使用時の設定
    global: 'globalThis',
  },
});