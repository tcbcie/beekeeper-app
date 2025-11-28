#!/usr/bin/env node
/**
 * Script to create notification icons as valid PNG files
 * Creates simple bee-themed icons for notifications
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '..', 'public');

// Create 192x192 app icon
function createAppIcon() {
  const canvas = createCanvas(192, 192);
  const ctx = canvas.getContext('2d');

  // Background - warm honey color
  const gradient = ctx.createRadialGradient(96, 96, 20, 96, 96, 120);
  gradient.addColorStop(0, '#FDB44B');
  gradient.addColorStop(1, '#F59E0B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 192, 192);

  // Hexagon shape (beehive inspired)
  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 4;

  const centerX = 96;
  const centerY = 96;
  const radius = 70;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bee stripes
  ctx.fillStyle = '#78350F';
  ctx.fillRect(centerX - 50, centerY - 10, 100, 8);
  ctx.fillRect(centerX - 50, centerY + 5, 100, 8);
  ctx.fillRect(centerX - 50, centerY + 20, 100, 8);

  // Text "HC" for HiveCraic
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HC', centerX, centerY);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(publicDir, 'icon-192x192.png'), buffer);
  console.log('✓ Created icon-192x192.png');
}

// Create 72x72 badge icon
function createBadgeIcon() {
  const canvas = createCanvas(72, 72);
  const ctx = canvas.getContext('2d');

  // Background - solid honey color
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, 0, 72, 72);

  // Simple hexagon
  ctx.fillStyle = '#FBBF24';
  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 2;

  const centerX = 36;
  const centerY = 36;
  const radius = 28;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Single bee stripe
  ctx.fillStyle = '#78350F';
  ctx.fillRect(centerX - 20, centerY - 3, 40, 6);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(publicDir, 'badge-72x72.png'), buffer);
  console.log('✓ Created badge-72x72.png');
}

try {
  createAppIcon();
  createBadgeIcon();
  console.log('\n✓ Successfully created all notification icons');
} catch (error) {
  console.error('Error creating icons:', error.message);
  process.exit(1);
}
