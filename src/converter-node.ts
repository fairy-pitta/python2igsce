// Node.js specific converter functions
import { Converter, convertPythonToIGCSE } from './converter';
import type { ConversionOptions, ConversionResult } from './types';

/**
 * Convert Python file to IGCSE pseudocode (Node.js only)
 */
export async function convertFileToIGCSE(
  filePath: string,
  options: Partial<ConversionOptions> = {}
): Promise<ConversionResult> {
  const fs = await import('fs/promises');
  const pythonCode = await fs.readFile(filePath, 'utf-8');
  return convertPythonToIGCSE(pythonCode, options);
}

/**
 * Convert multiple Python files to IGCSE pseudocode (Node.js only)
 */
export async function convertFilesToIGCSE(
  filePaths: string[],
  options: Partial<ConversionOptions> = {}
): Promise<Array<{ name: string; result: ConversionResult }>> {
  const converter = new Converter(options);
  const fs = await import('fs/promises');
  
  const files = await Promise.all(
    filePaths.map(async (filePath) => {
      const content = await fs.readFile(filePath, 'utf-8');
      return { name: filePath, content };
    })
  );
  
  return converter.convertBatch(files);
}