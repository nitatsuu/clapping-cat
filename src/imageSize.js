'use strict';

// Reads an image's pixel size from its header, so a custom image keeps its proportions
// in the editor without an image library.

/**
 * @param {Buffer} data the start of an image file (the first 64 KB is plenty)
 * @returns {{ width: number, height: number } | undefined}
 */
function imageSize(data) {
	const ascii = (/** @type {number} */ start, /** @type {number} */ end) => data.toString('latin1', start, end);
	if (data.length >= 10 && ascii(0, 4) === 'GIF8') {
		return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
	}
	if (data.length >= 24 && data.readUInt32BE(0) === 0x89504e47 && ascii(12, 16) === 'IHDR') {
		return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
	}
	if (data.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
		const chunk = ascii(12, 16);
		if (chunk === 'VP8X') {
			return { width: data.readUIntLE(24, 3) + 1, height: data.readUIntLE(27, 3) + 1 };
		}
		if (chunk === 'VP8 ') {
			return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
		}
		if (chunk === 'VP8L') {
			const bits = data.readUInt32LE(21);
			return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
		}
	}
	if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8) {
		// Walk the JPEG segments to the start-of-frame marker that holds the size.
		let offset = 2;
		while (offset + 9 < data.length && data[offset] === 0xff) {
			const marker = data[offset + 1];
			if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
				return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5) };
			}
			offset += 2 + data.readUInt16BE(offset + 2);
		}
	}
	return undefined;
}

module.exports = { imageSize };
