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

let lastShown = 0;

/** @param {vscode.ExtensionContext} context */
function activate(context) {
	vscode.window.showInformationMessage('Cat Clapping extension activated!');
	console.log('Cat Clapping activated');

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

	context.subscriptions.push(endListener, taskListener, debugTracker);
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
	if (showCatAtEditorTop(context)) {
		playSuccessSound(context);
	}
}

/** @param {vscode.ExtensionContext} context */
function showCatAtEditorTop(context) {
	const now = Date.now();
	if (now - lastShown < 1500) {
		return false;
	}
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return false;
	}
	lastShown = now;
	const gifPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'cat-clapping.gif');
	const decorationType = vscode.window.createTextEditorDecorationType({
		before: {
			contentIconPath: gifPath,
			textDecoration: 'none; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); pointer-events: none; z-index: 10;',
			width: '60px',
			height: '60px'
		},
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
	});
	const placeAtTop = () => {
		const line = editor.visibleRanges[0]?.start.line ?? 0;
		const position = new vscode.Position(line, 0);
		editor.setDecorations(decorationType, [new vscode.Range(position, position)]);
	};
	placeAtTop();
	const scrollListener = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
		if (event.textEditor === editor) {
			placeAtTop();
		}
	});
	setTimeout(() => {
		scrollListener.dispose();
		decorationType.dispose();
	}, 7000);
	return true;
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
