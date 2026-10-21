import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Manifest & Configuration', () => {
  it('has a valid manifest.json with required PWA fields', () => {
    const manifestPath = path.resolve(__dirname, '../public/manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('Roomba Zoomba');
    expect(manifest.short_name).toBe('RoombaZoomba');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#282c34');
    expect(manifest.background_color).toBe('#282c34');

    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('references manifest and icons in index.html', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('rel="apple-touch-icon"');
  });
});
