#!/usr/bin/env node
/**
 * Deploy script with exponential backoff retry for failed deployments.
 * 
 * Usage: node scripts/deploy.mjs [--environment preview|production]
 * 
 * On each failure, it waits with exponential backoff (2s, 4s, 8s, 16s, 30s max)
 * before retrying, up to a maximum number of attempts.
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import process from 'process';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000; // 2 seconds
const MAX_DELAY_MS = 30000; // 30 seconds

const environment = process.argv.find(arg => arg.startsWith('--environment='))
  ? process.argv.find(arg => arg.startsWith('--environment='))!.split('=')[1]
  : 'preview';

const deployCmd = environment === 'production'
  ? 'npx freebuff sites deploy --environment production'
  : 'npx freebuff sites deploy --environment preview';

let attempt = 0;

async function deployWithRetry() {
  while (attempt < MAX_ATTEMPTS) {
    attempt++;
    console.log(`\n=== Deployment attempt ${attempt}/${MAX_ATTEMPTS} (${environment}) ===`);

    try {
      await runDeploy();
      console.log('✅ Deployment succeeded!');
      return true;
    } catch (error) {
      console.error(`❌ Deployment failed: ${error.message}`);

      if (attempt >= MAX_ATTEMPTS) {
        console.error(`❌ Max attempts (${MAX_ATTEMPTS}) reached. Giving up.`);
        process.exit(1);
      }

      // Calculate exponential backoff delay
      const delayMs = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
      const seconds = delayMs / 1000;

      console.log(`⏳ Waiting ${seconds}s before next retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function runDeploy() {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-c', deployCmd], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    proc.on('close', (code) => {
      const output = stdoutData.trim() || stderrData.trim();
      if (code === 0) {
        console.log('Deploy output:', output.substring(0, 200) + (output.length > 200 ? '...' : ''));
        resolve();
      } else {
        const errorMsg = output || 'Unknown deployment error';
        reject(new Error(`Deploy exited with code ${code}: ${errorMsg}`));
      }
    });

    proc.on('error', reject);
  });
}

// Run the deployment with retry
deployWithRetry()
  .then(() => {
    console.log('\n🎉 Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Deployment failed after all retries:', error.message);
    process.exit(1);
  });