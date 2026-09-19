#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * This script checks if the backend is healthy and CORS is configured correctly.
 * Usage: node scripts/health-check.js
 * 
 * Environment variables:
 * - BACKEND_URL: The backend URL to check (default: http://localhost:5000)
 * - FRONTEND_URL: The frontend URL to test CORS with (default: http://localhost:5173)
 */

const http = require('http');
const https = require('https');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function checkHealth() {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/health',
      method: 'GET',
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const body = JSON.parse(data);
            if (body.status === 'ok') {
              resolve({ status: 'ok', statusCode: res.statusCode });
            } else {
              reject(new Error(`Health check returned unexpected status: ${body.status}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse health check response: ${e.message}`));
          }
        } else {
          reject(new Error(`Health check failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Health check request timed out'));
    });
    req.end();
  });
}

function checkCors() {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/api/auth/login',
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    };

    const req = client.request(options, (res) => {
      const acao = res.headers['access-control-allow-origin'];
      const acac = res.headers['access-control-allow-credentials'];
      
      resolve({
        statusCode: res.statusCode,
        'access-control-allow-origin': acao,
        'access-control-allow-credentials': acac,
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('CORS check request timed out'));
    });
    req.end();
  });
}

async function main() {
  console.log('🔍 Health Check Script');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('');

  try {
    // Check health endpoint
    console.log('1️⃣ Checking health endpoint...');
    const health = await checkHealth();
    console.log(`   ✅ Health check passed (status: ${health.status}, code: ${health.statusCode})`);
    console.log('');

    // Check CORS
    console.log('2️⃣ Checking CORS configuration...');
    const cors = await checkCors();
    console.log(`   ✅ CORS preflight passed (code: ${cors.statusCode})`);
    console.log(`   Access-Control-Allow-Origin: ${cors['access-control-allow-origin'] || 'not set'}`);
    console.log(`   Access-Control-Allow-Credentials: ${cors['access-control-allow-credentials'] || 'not set'}`);
    
    if (cors['access-control-allow-origin'] === FRONTEND_URL || cors['access-control-allow-origin'] === '*') {
      console.log('   ✅ CORS origin is correctly configured');
    } else {
      console.log('   ⚠️  CORS origin may not be configured correctly');
      console.log(`      Expected: ${FRONTEND_URL} or *`);
      console.log(`      Got: ${cors['access-control-allow-origin']}`);
    }
    console.log('');

    console.log('✅ All checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

main();
