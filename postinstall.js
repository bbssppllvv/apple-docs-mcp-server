#!/usr/bin/env node

import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'embeddings.db');
const DB_URL = 'https://github.com/bbssppllvv/apple-docs-mcp-server/raw/master/embeddings.db';

// Use stderr for immediate visibility in NPM (not buffered)
console.error('🍎 Apple Docs MCP Server - Post Install Setup');
console.error('='.repeat(50));

// Check if database already exists
if (fs.existsSync(DB_PATH)) {
    const stats = fs.statSync(DB_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`✅ Database already exists: ${sizeMB} MB`);
    console.log('🚀 Installation complete! Ready to use.');
    process.exit(0);
}

console.error('📥 Database not found. Downloading embeddings.db (~260MB)...');
console.error('⏳ This may take 1-3 minutes depending on your connection speed.');
console.error(`📡 Source: ${DB_URL}`);

const downloadDatabase = () => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(DB_PATH);
        let downloadedBytes = 0;
        const totalBytes = 259 * 1024 * 1024; // ~259MB

        const request = https.get(DB_URL, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                const redirectUrl = response.headers.location;
                console.log(`↪️  Redirecting to: ${redirectUrl}`);
                https.get(redirectUrl, handleResponse).on('error', reject);
                return;
            }
            
            handleResponse(response);
        });

        function handleResponse(response) {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed: ${response.statusCode} ${response.statusMessage}`));
                return;
            }

            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progressMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
                const totalMB = (totalBytes / (1024 * 1024)).toFixed(0);
                const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                
                // Update progress every 5MB using stderr (not buffered by NPM)
                if (downloadedBytes % (5 * 1024 * 1024) < chunk.length || downloadedBytes === totalBytes) {
                    // Use stderr for real-time progress in NPM
                    process.stderr.write(`\r📥 Downloading: ${progressMB}MB / ${totalMB}MB (${percent}%)`);
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                console.error('\n✅ Database downloaded successfully!');
                console.error('📚 Apple documentation database (16,253+ documents) ready!');
                console.error('🚀 Installation complete! Configure your .cursor/mcp.json and restart Cursor.');
                resolve();
            });
        }

        request.on('error', (err) => {
            fs.unlink(DB_PATH, () => {}); // Clean up partial file
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlink(DB_PATH, () => {}); // Clean up partial file
            reject(err);
        });
    });
};

// Download the database
downloadDatabase().catch((error) => {
    console.error('\n❌ Failed to download database:');
    console.error(`   ${error.message}`);
    console.log('\n🔧 Manual installation options:');
    console.log('1. Clone from GitHub:');
    console.log('   git clone https://github.com/bbssppllvv/apple-docs-mcp-server.git');
    console.log('2. Download manually:');
    console.log('   https://github.com/bbssppllvv/apple-docs-mcp-server/releases');
    console.log('3. Place embeddings.db in the installation directory');
    
    process.exit(1);
});
