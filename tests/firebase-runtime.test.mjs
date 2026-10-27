import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Firebase loads and JWKS resolves RSA keys without require(esm) support', () => {
  const script = `
    const assert = require('node:assert/strict');
    const { generateKeyPairSync, sign, verify } = require('node:crypto');
    require('firebase-admin/auth');
    require('firebase-admin/firestore');
    const jwksClient = require('jwks-rsa');
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig', alg: 'RS256' };
    const client = jwksClient({ fetcher: async () => ({ keys: [jwk] }) });
    (async () => {
      const key = await client.getSigningKey('test-key');
      const payload = Buffer.from('studybuddy-runtime-test');
      assert.ok(verify('RSA-SHA256', payload, key.getPublicKey(), sign('RSA-SHA256', payload, privateKey)));
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
