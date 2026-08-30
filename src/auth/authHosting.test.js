import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { auth } from '../firebase/config';

const canonicalOrigin = 'https://crm.keotasystem.com';
const firebaseAuthHelperOrigin = 'https://crm-web-app-97b91.firebaseapp.com';

describe('canonical Firebase Auth hosting contract', () => {
  it('uses the CRM production domain for Firebase Auth browser flows', () => {
    expect(auth.config.authDomain).toBe(new URL(canonicalOrigin).hostname);
    expect(new URL(`https://${auth.config.authDomain}/__/auth/handler`).origin).toBe(canonicalOrigin);
  });

  it('proxies Firebase Auth helpers before the Vercel SPA fallback', () => {
    const vercelConfig = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8'));

    expect(vercelConfig.rewrites).toEqual([
      {
        source: '/__/auth/:path*',
        destination: `${firebaseAuthHelperOrigin}/__/auth/:path*`,
      },
      {
        source: '/(.*)',
        destination: '/index.html',
      },
    ]);
  });
});
