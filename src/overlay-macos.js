'use strict';

// Not a Node module: macOS runs this file with `osascript -l JavaScript` (JXA), which
// gives JavaScript access to Cocoa. It shows a transparent, click-through window with
// the animated image for a few seconds, then exits.
//
// argv[0] is JSON: { image, crop?, position, anchor, offsetX, offsetY, size, layer, seconds, pid }

ObjC.import('Cocoa');
ObjC.import('CoreGraphics');

/** @param {string[]} argv */
function run(argv) {
	const options = JSON.parse(argv[0]);
	const image = $.NSImage.alloc.initWithContentsOfFile(options.image);
	if (image.isNil()) {
		throw new Error(`Cannot load image ${options.image}`);
	}
	// `crop` (fractions of the image, from the top-left) trims transparent padding: the
	// window shows only that part, and `size` is the height of the visible part.
	const crop = options.crop ?? { x: 0, y: 0, width: 1, height: 1 };
	const imageHeight = options.size / crop.height;
	const imageWidth = imageHeight * image.size.width / image.size.height;
	const width = Math.round(imageWidth * crop.width);
	const height = Math.round(options.size);
	const frame = place(anchorRect(options), width, height, options);

	const app = $.NSApplication.sharedApplication;
	app.setActivationPolicy($.NSApplicationActivationPolicyAccessory); // no Dock icon, no focus

	const window = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
		$.NSMakeRect(frame.x, frame.y, width, height), $.NSWindowStyleMaskBorderless, $.NSBackingStoreBuffered, false);
	window.opaque = false;
	window.backgroundColor = $.NSColor.clearColor;
	window.hasShadow = false;
	window.ignoresMouseEvents = true;
	window.level = options.layer === 'normal' ? $.NSNormalWindowLevel : $.NSStatusWindowLevel;
	window.collectionBehavior = $.NSWindowCollectionBehaviorCanJoinAllSpaces |
		$.NSWindowCollectionBehaviorFullScreenAuxiliary |
		$.NSWindowCollectionBehaviorStationary |
		$.NSWindowCollectionBehaviorIgnoresCycle;

	// The image view is larger than the window and shifted so the cropped part shows.
	const view = $.NSImageView.alloc.initWithFrame($.NSMakeRect(
		-crop.x * imageWidth, -(1 - crop.y - crop.height) * imageHeight, imageWidth, imageHeight));
	view.image = image;
	view.animates = true;
	view.imageScaling = $.NSImageScaleProportionallyUpOrDown;
	const content = $.NSView.alloc.initWithFrame($.NSMakeRect(0, 0, width, height));
	content.addSubview(view);
	window.contentView = content;
	window.orderFrontRegardless;

	$.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(options.seconds));
}

/**
 * The rectangle to position against, in Cocoa coordinates (origin at the bottom-left of
 * the primary screen): the frontmost VS Code window, or the usable area of its screen.
 */
function anchorRect(options) {
	const vscodeWindow = frontmostWindowOf(options.pid);
	if (vscodeWindow && options.anchor !== 'screen') {
		return vscodeWindow;
	}
	const screens = [];
	for (let i = 0; i < $.NSScreen.screens.count; i++) {
		const visible = $.NSScreen.screens.objectAtIndex(i).visibleFrame;
		screens.push({ x: visible.origin.x, y: visible.origin.y, width: visible.size.width, height: visible.size.height });
	}
	const target = vscodeWindow
		? { x: vscodeWindow.x + vscodeWindow.width / 2, y: vscodeWindow.y + vscodeWindow.height / 2 }
		: $.NSEvent.mouseLocation;
	return screens.find(screen => contains(screen, target)) ?? screens[0];
}

/** The frontmost regular window owned by process `pid`, or undefined. */
function frontmostWindowOf(pid) {
	const list = ObjC.deepUnwrap(ObjC.castRefToObject(
		$.CGWindowListCopyWindowInfo($.kCGWindowListOptionOnScreenOnly | $.kCGWindowListExcludeDesktopElements, 0)));
	// The list is ordered front to back; skip tooltips, menus and other small helper windows.
	const match = (list ?? []).find(w => w.kCGWindowOwnerPID === pid && w.kCGWindowLayer === 0 &&
		w.kCGWindowBounds.Width > 200 && w.kCGWindowBounds.Height > 200);
	if (!match) {
		return undefined;
	}
	// Window bounds use a top-left origin; flip them into Cocoa's bottom-left origin.
	const bounds = match.kCGWindowBounds;
	const primaryHeight = $.NSScreen.screens.objectAtIndex(0).frame.size.height;
	return { x: bounds.X, y: primaryHeight - bounds.Y - bounds.Height, width: bounds.Width, height: bounds.Height };
}

/** Bottom-left corner of a width x height window at `options.position` inside `area`. */
function place(area, width, height, options) {
	const [vertical, horizontal = 'center'] = options.position.split('-');
	const x = horizontal === 'left' ? area.x + options.offsetX
		: horizontal === 'right' ? area.x + area.width - width - options.offsetX
			: area.x + (area.width - width) / 2 + options.offsetX;
	// Cocoa's y grows upwards, so "top" is the high end of the area.
	const y = vertical === 'top' ? area.y + area.height - height - options.offsetY
		: vertical === 'bottom' ? area.y + options.offsetY
			: area.y + (area.height - height) / 2 - options.offsetY;
	return { x, y };
}

function contains(rect, point) {
	return point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
}
