'use strict';

const vscode = require('vscode');
const { execFile } = require('child_process');
const {
	isBuildCommand,
	isRunCommand,
	isCommandEnabled,
	isDebugSessionEnabled,
	isSuccessfulDebugExit
} = require('./commands');
const { showEditorCat } = require('./editorCat');
const { isFloatingSupported, showFloatingCat, closeFloatingCats } = require('./floatingCat');

/** Length of the built-in animation and sound. */
const CELEBRATION_SECONDS = 7;

const BUILT_IN_CAT = {
	file: 'cat-clapping.gif',
	aspect: 576 / 1024,
	// The visible cat inside the GIF's transparent padding, measured over all frames.
	crop: { x: 0.07, y: 0.24, width: 0.67, height: 0.6 }
};

let celebratingUntil = 0;

/** @param {vscode.ExtensionContext} context */
function activate(context) {
	const showCommand = vscode.commands.registerCommand('clappingCat.show', () => celebrate(context));

	const endListener = vscode.window.onDidEndTerminalShellExecution(event => {
		const command = event.execution.commandLine.value;
		if (event.exitCode === 0 &&
			isCommandEnabled(command, enabledCommands(), isBuildCommand(command) || isRunCommand(command))) {
			celebrate(context);
		}
	});

	const taskListener = vscode.tasks.onDidEndTaskProcess(event => {
		if (event.exitCode !== 0) {
			return;
		}
		const task = event.execution.task;
		const resource = typeof task.scope === 'object' ? task.scope.uri : undefined;
		if (isCelebrationTask(task, enabledCommands(resource))) {
			celebrate(context);
		}
	});

	const debugTracker = vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: session => ({
			onDidSendMessage: message => {
				if (isSuccessfulDebugExit(message) &&
					isDebugSessionEnabled(session.configuration, enabledCommands(session.workspaceFolder?.uri))) {
					celebrate(context);
				}
			}
		})
	});

	context.subscriptions.push(showCommand, endListener, taskListener, debugTracker, { dispose: closeFloatingCats });
}

/**
 * @param {vscode.Uri} [resource]
 * @returns {string[]}
 */
function enabledCommands(resource) {
	const configured = vscode.workspace
		.getConfiguration('clappingCat', resource ?? vscode.window.activeTextEditor?.document.uri)
		.get('enabledCommands', ['*']);
	return Array.isArray(configured) ? configured.filter(value => typeof value === 'string') : ['*'];
}

/**
 * @param {vscode.Task} task
 * @param {string[]} enabled
 */
function isCelebrationTask(task, enabled) {
	const execution = task.execution;
	if (execution instanceof vscode.ProcessExecution) {
		const command = `"${execution.process}"`;
		if (isCommandEnabled(command, enabled, isBuildCommand(execution.process) ||
			isRunCommand(execution.process) || /\.exe$/i.test(execution.process))) {
			return true;
		}
	}
	if (execution instanceof vscode.ShellExecution) {
		const rawCommand = execution.commandLine ?? execution.command;
		const command = typeof rawCommand === 'string' ? rawCommand : rawCommand?.value;
		if (command && isCommandEnabled(command, enabled, isBuildCommand(command) || isRunCommand(command))) {
			return true;
		}
	}
	const isNamedTask = task.group?.id === vscode.TaskGroup.Build.id ||
		task.group?.id === vscode.TaskGroup.Test.id ||
		/\b(build|compile|run|execute|test)\b/i.test(task.name);
	return isNamedTask && enabled.some(value => ['*', 'tasks'].includes(value.trim().toLowerCase()));
}

/** @param {vscode.ExtensionContext} context */
function celebrate(context) {
	// One cat at a time: ignore successes that finish while the cat is still clapping.
	const now = Date.now();
	if (now < celebratingUntil) {
		return;
	}
	celebratingUntil = now + CELEBRATION_SECONDS * 1000;
	showCat(context);
	playSuccessSound(context);
}

/** @param {vscode.ExtensionContext} context */
function showCat(context) {
	const config = vscode.workspace.getConfiguration('clappingCat');
	const image = vscode.Uri.joinPath(context.extensionUri, 'media', BUILT_IN_CAT.file);
	const placement = {
		position: config.get('position', 'bottom-right'),
		offsetX: config.get('offsetX', 24),
		offsetY: config.get('offsetY', 24),
		size: config.get('size', 150),
		seconds: CELEBRATION_SECONDS
	};
	if (config.get('display', 'floating') === 'floating' && isFloatingSupported()) {
		showFloatingCat({
			...placement,
			image: image.fsPath,
			crop: BUILT_IN_CAT.crop,
			anchor: config.get('anchor', 'window'),
			layer: config.get('layer', 'top')
		});
	} else {
		showEditorCat({ ...placement, image, aspect: BUILT_IN_CAT.aspect, crop: BUILT_IN_CAT.crop });
	}
}

/**
 * @param {vscode.ExtensionContext} context
 * @param {() => void} [onFinished]
 */
function playSuccessSound(context, onFinished) {
	const audioPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'cat-clapping.wav').fsPath;
	if (process.platform === 'win32') {
		const escapedPath = audioPath.replace(/'/g, "''");
		const command = `$player = New-Object System.Media.SoundPlayer; $player.SoundLocation = '${escapedPath}'; $player.Load(); $player.PlaySync();`;
		execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true }, error => {
			if (error) {
				console.error('[Clapping Cat] Audio error:', error);
			}
			onFinished?.();
		});
		return;
	}
	/** @type {[string, string[]][]} */
	const players = process.platform === 'darwin'
		? [['afplay', [audioPath]]]
		: [['paplay', [audioPath]], ['aplay', [audioPath]]];
	/** @param {number} index */
	const tryPlayer = index => {
		if (index >= players.length) {
			console.error('[Clapping Cat] No supported audio player found. Install paplay or aplay.');
			onFinished?.();
			return;
		}
		const [file, args] = players[index];
		execFile(file, args, error => {
			if (error) {
				tryPlayer(index + 1);
			} else {
				onFinished?.();
			}
		});
	};
	tryPlayer(0);
}

function deactivate() { }

module.exports = { activate, deactivate };
