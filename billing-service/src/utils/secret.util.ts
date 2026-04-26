import { readFileSync } from 'fs';

export function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (filePath) {
    try {
      const value = readFileSync(filePath, 'utf8').trim();
      if (value.length > 0) return value;
    } catch {
      console.warn(
        `[secret] Unable to read ${name} from file ${filePath}, falling back to environment variable`,
      );
    }
  }

  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}
