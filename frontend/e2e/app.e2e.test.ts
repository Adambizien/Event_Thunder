import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const host = '127.0.0.1';
const port = 4173;
const baseUrl = `http://${host}:${port}`;

let server: ChildProcessWithoutNullStreams;

const waitForServer = async () => {
  const deadline = Date.now() + 20000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Vite preview did not start: ${String(lastError)}`);
};

const fetchText = async (path: string) => {
  const response = await fetch(`${baseUrl}${path}`);
  expect(response.status).toBe(200);
  return response.text();
};

describe('Frontend application (e2e)', () => {
  beforeAll(async () => {
    server = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      [
        'run',
        'preview',
        '--',
        '--host',
        host,
        '--port',
        String(port),
        '--strictPort',
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, VITE_API_URL: 'http://localhost:8000' },
      },
    );

    await waitForServer();
  });

  afterAll(() => {
    server?.kill();
  });

  it('serves the built SPA shell on the main user-facing routes', async () => {
    const routes = ['/', '/events', '/login', '/register', '/subscription'];

    for (const route of routes) {
      const html = await fetchText(route);
      expect(html).toContain('<div id="root"></div>');
      expect(html).toContain('/assets/');
      expect(html).toContain('Event Thunder');
    }
  });

  it('serves generated JavaScript, CSS and public assets', async () => {
    const html = await fetchText('/');
    const assetPaths = [
      ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
    ].map((match) => match[1]);

    expect(assetPaths.length).toBeGreaterThanOrEqual(2);

    for (const assetPath of assetPaths) {
      const response = await fetch(`${baseUrl}${assetPath}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type') || '').toMatch(
        /javascript|text\/css/,
      );
    }

    const logoResponse = await fetch(`${baseUrl}/thunder.svg`);
    expect(logoResponse.status).toBe(200);
    expect(logoResponse.headers.get('content-type') || '').toContain(
      'image/svg+xml',
    );
  });
});
