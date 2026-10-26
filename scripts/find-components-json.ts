import fs from 'fs';
import path from 'path';

function findComponentsJson(dir: string): string | null {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
          const found = findComponentsJson(fullPath);
          if (found) return found;
        }
      } else if (entry.name === 'components.json') {
        return fullPath;
      }
    }
  } catch (e) {
    // ignore permission errors
  }
  return null;
}

const result = findComponentsJson('D:\\proyectos\\facturas');
console.log(result || 'Not found');