'use strict';

// Ported from the Cat Clapping 0.0.7 test suite.

const { suite, test } = require('node:test');
const assert = require('node:assert');
const {
	isBuildCommand,
	isRunCommand,
	isCommandEnabled,
	isDebugSessionEnabled,
	isSuccessfulDebugExit
} = require('../src/commands');
const manifest = require('../package.json');

suite('Run command detection', () => {
	test('recognizes scripts and direct executables', () => {
		for (const command of [
			'python script.py',
			'python3.12 -m my_module',
			'py -3 script.py',
			'node app.js',
			'npm run start',
			'cargo run',
			'./my-program',
			'.\\program.exe',
			'& "C:\\Program Files\\My App\\app.exe" --verbose'
		]) {
			assert.ok(isRunCommand(command), command);
		}
	});

	test('ignores unrelated shell commands', () => {
		for (const command of ['cd src', 'ls -la', 'git status', 'echo python script.py']) {
			assert.ok(!isRunCommand(command), command);
		}
	});
});

suite('Build command detection', () => {
	test('recognizes builds regardless of case', () => {
		for (const command of ['npm run build', 'NPX TSC', 'cargo build --release', 'g++ main.cpp', 'make']) {
			assert.ok(isBuildCommand(command), command);
		}
	});

	test('ignores unrelated shell commands', () => {
		for (const command of ['cd src', 'git status', 'npm install']) {
			assert.ok(!isBuildCommand(command), command);
		}
	});
});

suite('Enabled command setting', () => {
	test('the manifest declares the default setting', () => {
		const setting = manifest.contributes.configuration.properties['clappingCat.enabledCommands'];
		assert.deepStrictEqual(setting.default, ['*']);
	});

	test('the default wildcard keeps built-in detection', () => {
		assert.ok(isCommandEnabled('python script.py', ['*'], true));
		assert.ok(!isCommandEnabled('git status', ['*'], false));
	});

	test('users can select npm or Python independently', () => {
		assert.ok(isCommandEnabled('npm run build', ['npm'], true));
		assert.ok(isCommandEnabled('npx tsc', ['npm'], true));
		assert.ok(!isCommandEnabled('python script.py', ['npm'], true));
		assert.ok(isCommandEnabled('py -3 script.py', ['python'], true));
		assert.ok(isCommandEnabled('python3.12 script.py', ['py'], true));
		assert.ok(!isCommandEnabled('npm run build', ['python'], true));
	});

	test('specific commands and empty lists are supported', () => {
		assert.ok(isCommandEnabled('git status', ['git'], false));
		assert.ok(isCommandEnabled('& "C:\\Apps\\myapp.exe"', ['myapp.exe'], true));
		assert.ok(isCommandEnabled('.\\myapp.exe', ['executable'], true));
		assert.ok(!isCommandEnabled('npm run build', [], true));
	});

	test('debug sessions follow the same choice', () => {
		assert.ok(isDebugSessionEnabled({ type: 'debugpy' }, ['python']));
		assert.ok(!isDebugSessionEnabled({ type: 'pwa-node' }, ['python']));
		assert.ok(isDebugSessionEnabled({ type: 'pwa-node' }, ['node']));
		assert.ok(isDebugSessionEnabled({ type: 'custom' }, ['debug']));
		assert.ok(!isDebugSessionEnabled({ type: 'custom' }, []));
	});
});

suite('Debug exit detection', () => {
	test('celebrates only a successful program exit', () => {
		assert.ok(isSuccessfulDebugExit({ type: 'event', event: 'exited', body: { exitCode: 0 } }));
		assert.ok(!isSuccessfulDebugExit({ type: 'event', event: 'exited', body: { exitCode: 1 } }));
		assert.ok(!isSuccessfulDebugExit({ type: 'event', event: 'terminated' }));
	});
});
