'use strict';

// Decides which commands deserve a celebration. Ported from Cat Clapping 0.0.7 by Nicola (MIT).

/** Build and compile commands recognised by the default `["*"]` setting. */
const BUILD_COMMANDS = [
	// JavaScript / TypeScript
	/\bnpm\s+run\s+build\b/,
	/\bnpm\s+run\s+compile\b/,
	/\byarn\s+build\b/,
	/\byarn\s+compile\b/,
	/\bpnpm\s+build\b/,
	/\bpnpm\s+compile\b/,
	/\bnpx\s+tsc\b/,
	/\btsc\b/,
	// Java
	/\bmvn\s/,
	/\bmvnw\s/,
	/\bgradle\s/,
	/\bgradlew\s/,
	// .NET
	/\bdotnet\s+build\b/,
	// Rust
	/\bcargo\s+build\b/,
	// Go
	/\bgo\s+build\b/,
	// C / C++
	/\bmake\b/,
	/\bcmake\b/,
	/\bg\+\+(?=\s|$)/,
	/\bclang\+\+(?=\s|$)/,
	/\bcl(\.exe)?\b/,
	/\bcmake\s+--build\b/,
	/\bninja\b/,
	// Salesforce
	/\bsf\s+project\s+deploy\b/,
	/\bsfdx\s+force:source:deploy\b/
];

/** @param {string} command */
function isBuildCommand(command) {
	const lower = command.toLowerCase();
	return BUILD_COMMANDS.some(pattern => pattern.test(lower));
}

/**
 * Commands that run a program rather than merely navigate or inspect the shell.
 * @param {string} command
 */
function isRunCommand(command) {
	const invocation = command.trim().replace(/^&\s+/, '');
	// Direct executable paths, including PowerShell's & "..." syntax.
	if (/^(?:"[^"]+\.exe"|'[^']+\.exe'|[^\s"'|;&<>]+\.exe)(?=\s|$)/i.test(invocation)) {
		return true;
	}
	if (/^(?:\.\/|\.\\|~\/|\/)[^\s|;&<>]+/.test(invocation)) {
		return true;
	}
	// Interpreters, script runners and common run commands.
	return /^(?:python(?:\d+(?:\.\d+)?)?|py|node|bun|deno|tsx|ts-node|ruby|php|perl|java|kotlin|swift|lua|rscript|bash|sh|zsh)(?:\.exe)?(?=\s|$)/i.test(invocation)
		|| /^(?:dotnet|cargo|go)\s+run\b/i.test(invocation)
		|| /^(?:npm|pnpm|yarn)\s+(?:run\s+\S+|start\b|test\b|exec\b)/i.test(invocation)
		|| /^npx\s+\S+/i.test(invocation);
}

/**
 * Names users can put in the enabledCommands setting for a shell command.
 * @param {string} command
 * @returns {string[]}
 */
function commandSelectors(command) {
	const match = /^\s*(?:&\s*)?(?:"([^"]+)"|'([^']+)'|([^\s|;&<>]+))/.exec(command);
	if (!match) {
		return [];
	}
	const token = (match[1] ?? match[2] ?? match[3]).toLowerCase();
	const name = token.split(/[\\/]/).pop() ?? token;
	const stem = name.replace(/\.(?:exe|cmd|bat)$/i, '');
	const selectors = new Set([name, stem]);
	if (/^(?:python(?:\d+(?:\.\d+)?)?|py)$/.test(stem) || name.endsWith('.py')) {
		selectors.add('python');
		selectors.add('py');
	}
	if (stem === 'npx') {
		selectors.add('npm');
	}
	if (/^(?:node|tsx|ts-node|bun|deno)$/.test(stem) || name.endsWith('.js')) {
		selectors.add('node');
	}
	if (/^(?:\.\/|\.\\|~\/|\/|[a-z]:[\\/])/i.test(token) || name.endsWith('.exe')) {
		selectors.add('executable');
	}
	return [...selectors];
}

/**
 * '*' keeps the built-in supported-command detection; named entries opt in explicitly.
 * @param {string} command
 * @param {string[]} enabled
 * @param {boolean} supported
 */
function isCommandEnabled(command, enabled, supported) {
	const choices = enabled.map(value => value.trim().toLowerCase());
	return (choices.includes('*') && supported) ||
		commandSelectors(command).some(selector => choices.includes(selector));
}

/**
 * @param {{ type?: unknown, runtimeExecutable?: unknown, program?: unknown }} configuration
 * @param {string[]} enabled
 */
function isDebugSessionEnabled(configuration, enabled) {
	const choices = enabled.map(value => value.trim().toLowerCase());
	if (choices.includes('*') || choices.includes('debug')) {
		return true;
	}
	const selectors = new Set();
	if (typeof configuration.runtimeExecutable === 'string') {
		commandSelectors(configuration.runtimeExecutable).forEach(value => selectors.add(value));
	}
	if (typeof configuration.program === 'string') {
		commandSelectors(configuration.program).forEach(value => selectors.add(value));
	}
	if (typeof configuration.type === 'string') {
		const type = configuration.type.toLowerCase();
		const family = /python|debugpy/.test(type) ? 'python'
			: /node/.test(type) ? 'node'
				: /cpp|lldb|gdb/.test(type) ? 'executable'
					: /coreclr|dotnet/.test(type) ? 'dotnet'
						: type;
		selectors.add(family);
	}
	return [...selectors].some(selector => choices.includes(selector));
}

/**
 * The Debug Adapter Protocol reports a successful program exit with this event.
 * @param {unknown} message
 */
function isSuccessfulDebugExit(message) {
	if (typeof message !== 'object' || message === null) {
		return false;
	}
	const event = /** @type {{ type?: string, event?: string, body?: { exitCode?: number } }} */ (message);
	return event.type === 'event' && event.event === 'exited' && event.body?.exitCode === 0;
}

module.exports = {
	isBuildCommand,
	isRunCommand,
	commandSelectors,
	isCommandEnabled,
	isDebugSessionEnabled,
	isSuccessfulDebugExit
};
