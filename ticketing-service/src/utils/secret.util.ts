import * as fs from 'node:fs';

export const readSecret = (name: string): string | undefined => {
  const filePath = process.env[`${name}_FILE`];
  if (!filePath) {
    return process.env[name];
  }

  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    return process.env[name];
  }
};
