'use strict';

// The original way to show the cat: a decoration inside the active text editor. VS Code
// clips decorations to the editor, so this cannot cover the terminal or other panels.

const vscode = require('vscode');

/**
 * @param {{ image: vscode.Uri, aspect: number, crop?: { x: number, y: number, width: number, height: number },
 *   position: string, offsetX: number, offsetY: number, size: number, seconds: number }} options
 * @returns {boolean} false when there is no text editor to show the cat in
 */
function showEditorCat(options) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return false;
	}
	const crop = options.crop ?? { x: 0, y: 0, width: 1, height: 1 };
	const height = options.size;
	const width = Math.round(height * options.aspect * crop.width / crop.height);
	const [vertical, horizontal = 'center'] = options.position.split('-');
	const css = ['position: absolute', 'pointer-events: none', 'z-index: 10', backgroundCss(options.image, crop)];
	const translate = [];
	if (horizontal === 'left') {
		css.push(`left: ${options.offsetX}px`);
	} else if (horizontal === 'right') {
		css.push('left: auto', `right: ${options.offsetX}px`);
	} else {
		css.push(`left: calc(50% + ${options.offsetX}px)`);
		translate.push('translateX(-50%)');
	}
	// The cat hangs off a visible line: the first one for top, the last one for bottom.
	if (vertical === 'top') {
		css.push(`top: ${options.offsetY}px`);
	} else if (vertical === 'bottom') {
		css.push('top: auto', `bottom: ${options.offsetY}px`);
	} else {
		css.push(`top: calc(50% + ${options.offsetY}px)`);
		translate.push('translateY(-50%)');
	}
	if (translate.length) {
		css.push(`transform: ${translate.join(' ')}`);
	}

	const decorationType = vscode.window.createTextEditorDecorationType({
		before: {
			contentText: '',
			// textDecoration is copied into the generated CSS rule, which lets us add positioning.
			textDecoration: `none; ${css.join('; ')};`,
			width: `${width}px`,
			height: `${height}px`
		},
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
	});
	const place = () => {
		const ranges = editor.visibleRanges;
		const first = ranges[0]?.start.line ?? 0;
		const last = ranges[ranges.length - 1]?.end.line ?? first;
		const line = vertical === 'top' ? first : vertical === 'bottom' ? last : Math.floor((first + last) / 2);
		const position = new vscode.Position(line, 0);
		editor.setDecorations(decorationType, [new vscode.Range(position, position)]);
	};
	place();
	const scrollListener = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
		if (event.textEditor === editor) {
			place();
		}
	});
	setTimeout(() => {
		scrollListener.dispose();
		decorationType.dispose();
	}, options.seconds * 1000);
	return true;
}

/**
 * The image as a background scaled into the box. Unlike `contentIconPath` (CSS
 * `content: url()`), which always renders at the image's natural size and overflows the
 * box, this keeps the cat at the configured size and shows only the `crop` region.
 * @param {vscode.Uri} image
 * @param {{ x: number, y: number, width: number, height: number }} crop
 */
function backgroundCss(image, crop) {
	// The URL VS Code itself uses for local files in the desktop app.
	const url = image.with({ scheme: 'vscode-file', authority: 'vscode-app' }).toString();
	const percent = (/** @type {number} */ offset, /** @type {number} */ part) =>
		part < 1 ? `${(offset / (1 - part)) * 100}%` : '0%';
	return `background: url("${url}") ${percent(crop.x, crop.width)} ${percent(crop.y, crop.height)} / ` +
		`${100 / crop.width}% ${100 / crop.height}% no-repeat`;
}

module.exports = { showEditorCat };
