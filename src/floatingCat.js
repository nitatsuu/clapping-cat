'use strict';

// A transparent always-on-top window outside VS Code, so the cat can cover the terminal
// and any other part of the window. Extensions cannot draw over the workbench themselves.

const { execFile } = require('child_process');
const path = require('path');

const OVERLAY_SCRIPT = path.join(__dirname, 'overlay-macos.js');

/** @type {Set<import('child_process').ChildProcess>} */
const running = new Set();

function isFloatingSupported() {
	return process.platform === 'darwin';
}

/**
 * @param {{ image: string, crop?: { x: number, y: number, width: number, height: number },
 *   position: string, anchor: string, offsetX: number, offsetY: number, size: number,
 *   layer: string, seconds: number }} options
 */
function showFloatingCat(options) {
	// The extension host's parent is the VS Code main process, which owns the windows.
	const args = JSON.stringify({ ...options, pid: process.ppid });
	const child = execFile('osascript', ['-l', 'JavaScript', OVERLAY_SCRIPT, args],
		{ timeout: (options.seconds + 5) * 1000 }, error => {
			running.delete(child);
			if (error && !child.killed) {
				console.error('[Clapping Cat] Floating cat failed:', error.message);
			}
		});
	running.add(child);
}

function closeFloatingCats() {
	for (const child of running) {
		child.kill();
	}
}

module.exports = { isFloatingSupported, showFloatingCat, closeFloatingCats };
