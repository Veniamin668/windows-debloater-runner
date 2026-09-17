# Windows Runner Debloater

Aggressive debloater for Windows GitHub Actions runners.

This GitHub Action removes unnecessary preinstalled software from Windows runners to free disk space and leave only the software required for development and CI/CD.

## What stays

The following software is preserved:

- Firefox
- Visual Studio and its components
- Git for Windows
- Git Credential Manager
- GitHub CLI
- Tailscale (if installed)
- WSL
- Node.js
- npm
- npx
- PowerShell 7
- 7-Zip

## What gets removed

Software that is not on the allowlist may be removed if a supported uninstaller is available.

Examples:
- .NET Runtime
- .NET SDK
- Java
- Android SDK
- Android development tools
- AWS tools
- Azure tools
- MongoDB
- MySQL
- SQL Server
- sbt
- Xamarin
- MAUI
- other unnecessary preinstalled software

### P.S. Some software may still remain. I don't know why some applications fail to uninstall, but I'll try to fix this in the future.

The action also removes:

```text
C:\hostedtoolcache
C:\Program Files (x86)\Android
```
Usage

Add the action to your workflow:
``` code
      - name: Debloat windows
        uses: Veniamin668/windows-debloater-runner@v2
        with:
          enable: 'true'
```
Set enable to 'false' to disable the cleanup.

How it works

The action:

Detects installed software from the Windows uninstall registry.
Checks each application against the allowlist.
Keeps preserved software.
Silently uninstalls supported software outside the allowlist.
Stops unwanted services and processes.
Removes selected large directories.
Prints a cleanup summary.

Supported uninstallers include MSI, Inno Setup and NSIS.

Applications with unsupported uninstallers are skipped instead of being forcefully deleted.

Warning

This action is intentionally aggressive.

It is designed for disposable GitHub Actions Windows runners.

Do not use it on a personal Windows installation or a persistent server unless you understand what will be removed.

The exact software installed on GitHub-hosted runners can change over time, so the amount of removed software and freed disk space may vary.
