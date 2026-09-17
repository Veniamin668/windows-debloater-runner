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

Software that is not on the allowlist may be removed if a supported uninstaller is available. Cleanup via Chocolatey has also been integrated; it can be enabled using `choco-del: true`.

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

P.S: I managed to solve the problem by combining folder deletion, the use of Chocolatey, and registry cleaning. This frees up a lot of space, but if you want to completely clean the runner, it is better to uninstall Visual Studio and finish the cleanup manually (after using the script to remove unnecessary components, there isn't much left.)))

The action also removes:

```text
C:\hostedtoolcache
C:\Program Files (x86)\Android
C:\actionarchivecache
C:\Android (symlink)
C:\ghcup
C:\Julia
C:\mingw32
C:\mingw64
C:\Modules (if you included 'true' in the azure-del action)
C:\msys64
C:\selenium
C:\SeleniumWebDrivers
C:\Strawberry
C:\vcpkg
C:\Program Files\dotnet
C:\Program Files (x86)\dotnet
```
Usage

Add the action to your workflow:
``` code
      - name: Debloat windows
        uses: Veniamin668/windows-debloater-runner@м3
        with:
          enable: 'true'
          azure-del: 'true'
          choco-del: 'true'
```
Set enable to 'false' to disable the cleanup or azure-del false to disable delete Azure modules folder, and choco-del to delete software in chocolatey

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

If you want to free up even more space, uninstall Visual Studio 2026.

It is designed for disposable GitHub Actions Windows runners.

Do not use it on a personal Windows installation or a persistent server unless you understand what will be removed.

The exact software installed on GitHub-hosted runners can change over time, so the amount of removed software and freed disk space may vary.
