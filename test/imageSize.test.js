'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { imageSize } = require('../src/imageSize');

test('reads the built-in GIF and icon', () => {
	const media = path.join(__dirname, '..', 'media');
	assert.deepStrictEqual(imageSize(fs.readFileSync(path.join(media, 'cat-clapping.gif'))), { width: 576, height: 1024 });
	assert.deepStrictEqual(imageSize(fs.readFileSync(path.join(media, 'icon.png'))), { width: 254, height: 254 });
});

test('reads WebP headers', () => {
	// VP8X (extended, used by animated WebP): 24-bit width-1 and height-1 at offset 24.
	const vp8x = Buffer.alloc(30);
	vp8x.write('RIFF', 0, 'latin1');
	vp8x.write('WEBPVP8X', 8, 'latin1');
	vp8x.writeUIntLE(299, 24, 3);
	vp8x.writeUIntLE(499, 27, 3);
	assert.deepStrictEqual(imageSize(vp8x), { width: 300, height: 500 });

	// VP8L (lossless): 14-bit width-1 and height-1 packed after the 0x2f signature.
	const vp8l = Buffer.alloc(30);
	vp8l.write('RIFF', 0, 'latin1');
	vp8l.write('WEBPVP8L', 8, 'latin1');
	vp8l.writeUInt32LE((63) | (127 << 14), 21);
	assert.deepStrictEqual(imageSize(vp8l), { width: 64, height: 128 });
});

test('reads a JPEG start-of-frame after other segments', () => {
	const jpeg = Buffer.from([
		0xff, 0xd8,
		0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0 with a 2-byte payload
		0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0
	]);
	assert.deepStrictEqual(imageSize(jpeg), { width: 640, height: 480 });
});

test('returns undefined for other files', () => {
	assert.strictEqual(imageSize(Buffer.from('not an image at all')), undefined);
});
