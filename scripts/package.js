'use strict';

// Builds dist/<name>-<version>.vsix without vsce: a .vsix is a zip holding the
// extension under extension/ plus two XML manifests VS Code reads on install.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const manifest = require(path.join(root, 'package.json'));
const included = ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE.txt', 'src', 'media'];

/** @param {string} text */
const xml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const vsixManifest = `<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
	<Metadata>
		<Identity Language="en-US" Id="${xml(manifest.name)}" Version="${xml(manifest.version)}" Publisher="${xml(manifest.publisher)}" />
		<DisplayName>${xml(manifest.displayName)}</DisplayName>
		<Description xml:space="preserve">${xml(manifest.description)}</Description>
		<Tags>${xml(manifest.keywords.join(','))}</Tags>
		<Categories>${xml(manifest.categories.join(','))}</Categories>
		<GalleryFlags>Public</GalleryFlags>
		<Properties>
			<Property Id="Microsoft.VisualStudio.Code.Engine" Value="${xml(manifest.engines.vscode)}" />
			<Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="${xml((manifest.extensionKind ?? ['workspace']).join(','))}" />
			<Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true" />
			<Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="${xml(manifest.repository.url)}" />
			<Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
		</Properties>
		<License>extension/LICENSE.txt</License>
		<Icon>extension/${xml(manifest.icon)}</Icon>
	</Metadata>
	<Installation>
		<InstallationTarget Id="Microsoft.VisualStudio.Code"/>
	</Installation>
	<Dependencies/>
	<Assets>
		<Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
		<Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
		<Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true" />
		<Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE.txt" Addressable="true" />
		<Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/${xml(manifest.icon)}" Addressable="true" />
	</Assets>
</PackageManifest>
`;

const contentTypes = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
	<Default Extension=".vsixmanifest" ContentType="text/xml" />
	<Default Extension=".json" ContentType="application/json" />
	<Default Extension=".js" ContentType="application/javascript" />
	<Default Extension=".md" ContentType="text/markdown" />
	<Default Extension=".txt" ContentType="text/plain" />
	<Default Extension=".png" ContentType="image/png" />
	<Default Extension=".gif" ContentType="image/gif" />
	<Default Extension=".wav" ContentType="audio/wav" />
</Types>
`;

const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'clapping-cat-'));
try {
	for (const entry of included) {
		fs.cpSync(path.join(root, entry), path.join(staging, 'extension', entry), { recursive: true });
	}
	fs.writeFileSync(path.join(staging, 'extension.vsixmanifest'), vsixManifest);
	fs.writeFileSync(path.join(staging, '[Content_Types].xml'), contentTypes);

	const output = path.join(root, 'dist', `${manifest.name}-${manifest.version}.vsix`);
	fs.mkdirSync(path.dirname(output), { recursive: true });
	fs.rmSync(output, { force: true });
	execFileSync('zip', ['-q', '-r', '-X', output, '.'], { cwd: staging });
	console.log(`Packaged ${path.relative(root, output)} (${(fs.statSync(output).size / 1e6).toFixed(1)} MB)`);
} finally {
	fs.rmSync(staging, { recursive: true, force: true });
}
