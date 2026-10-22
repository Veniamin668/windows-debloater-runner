# Windows Runner Debloater

Aggressive debloater for Windows GitHub Actions runners.

This GitHub Action removes unnecessary preinstalled software from Windows runners to free disk space and leave only the software required for development and CI/CD.

## What stays

The following software is preserved:

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
C:\Program Files (x86)\Windows Kits
C:\Program Files (x86)\Microsoft (Edge)
C:\npm
%SYSTEMDRIVE%\aliyun-cli
%SYSTEMDRIVE%\Program Files\Android
%SYSTEMDRIVE%\Program Files\LLVM
%SYSTEMDRIVE%\Program Files\Microsoft SQL Server
%SYSTEMDRIVE%\Program Files (x86)\Microsoft SQL Server
%SYSTEMDRIVE%\ProgramData\Package Cache
%SYSTEMDRIVE%\ProgramData\pipelinesagent
%USERPROFILE%\.rustup
%USERPROFILE%\.dotnet
%USERPROFILE%\.cargo
%USERPROFILE%\.aliyun
%USERPROFILE\AppData\Local\Microsoft\OneDrive
%SYSTEMDRIVE%\ProgramData\runner
%SYSTEMDRIVE%\Tools
%SYSTEMDRIVE%\Users\Default\.cargo
%SYSTEMDRIVE%\Users\Default\.rustup
%SYSTEMDRIVE%\Users\Default\.dotnet
C:\shells
C:\PSModuleAnalysisCachePath
SYSTEMDRIVE\Program Files\Application Verifier
SYSTEMDRIVE\Program Files\Microsoft SDKs
SYSTEMDRIVE\Program Files (x86)\Application Verifier
SYSTEMDRIVE\Program Files (x86)\Microsoft SDKs
USERPROFILE\AppData\Local\AzureFunctionsTools
USERPROFILE\AppData\Local\.IdentityService
SYSTEMDRIVE\ProgramData\kind
SYSTEMDRIVE\Program Files (x86)\pipx_bin
SYSTEMDRIVE\Program Files (x86)\pipx
SYSTEMDRIVE\Program Files\Amazon
```
Usage

Add the action to your workflow:
``` code
      - name: Debloat windows
        uses: Veniamin668/windows-debloater-runner@v8
        with:
          enable: 'true'
          azure-del: 'true'
          choco-del: 'true'
          uwp-del: 'true'
          path-clean: 'true'
          del-installer-user: 'true'
          oobe-disable: 'true'
          wsl-rename: 'true'
          npm-del: 'true'
          install-zen: 'true'
```
Set enable to 'false' to disable the cleanup
```azure-del``` false to disable delete Azure modules folder 

```choco-del``` to delete software in chocolatey,

```uwp-del``` delete uwp apps. 

```del-installer-user``` removes the "installer" user and their folder, which takes up quite a bit of space. 

```oobe-disable``` Renames the WWAHost.exe file by appending "123" to their names to bypass the OOBE privacy settings screen.

```npm-del``` remove %SYSTEMDRIVE%\npm folder

```install-zen``` - install Zen Browser

```wsl-rename``` rename the wsl.exe file by appending "123" to the extension, thereby preventing the WSL update prompt on ARM-based runners

### 📊 Debloat Results (Before / After Comparison)

| 🗂️ Component / Description | 🪟 Windows Server 2022 | 🪟 Windows Server 2025 | 🪟 Windows 11 ARM64 |
| :--- | :--- | :--- | :--- |
| **📁 C: Drive / Folders**<br>*(File structure and disk state)* | <details open><summary>Before</summary><br><img src="screenshots/BEFORE2022FOLDERS.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/FOLDERSAFTER2022.png" width="400"></details> | <details open><summary>Before</summary><br><img src="screenshots/foldersbefore2025.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/AFTER-C-Folder2025.png" width="400"></details> | <details open><summary>Before</summary><br><img src="screenshots/FOLDERSBEFOREARM.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/FOLDERARM64.png" width="400"></details> |
| **📦 Installed Apps**<br>*(List of applications before & after cleanup)* | <details open><summary>Before</summary><br><img src="screenshots/BEFOREAPPS2022.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/APPSAFTER2022.png" width="400"></details> | <details open><summary>Before</summary><br><img src="screenshots/APPSBEFORE2025.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/AFTERinstapps2025.png" width="400"></details> | <details open><summary>Before</summary><br><img src="screenshots/APPSBEFOREARM.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/APPSAFTERARM.png" width="400"></details> |
| **🖥️ Desktop / General View**<br>*(Overall state and desktop preview)* | <details open><summary>Before</summary><br><img src="screenshots/BEFORE2022.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/AFTER2022.png" width="400"></details> | <details open><summary>Before</summary><br><img src="screenshots/BEFORE2025.png" width="400"></details><br><details open><summary>After</summary><br><img src="screenshots/after2025.png" width="400"></details> | <details open><summary>After</summary><br><img src="screenshots/AFTERARM64.png" width="400"></details> |
| **📉 Telemetry**<br>*(OOBE privacy screen bypass)* | — | — | <details open><summary>📸 View</summary><br><img src="screenshots/TELEMETRY!!!.png" width="400"><br><small>Default OOBE privacy settings screen (shown when <code>oobe-disable: 'false'</code>), which gets bypassed when set to <code>'true'</code>.</small></details> |

How it works

The action:

Detects installed software from the Windows uninstall registry.
Checks each application against the allowlist.
Keeps preserved software.
Silently uninstalls supported software outside the allowlist.
Stops unwanted services and processes.
Removes selected large directories.
Prints a cleanup summary.

Supported uninstallers include MSI, Inno Setup and NSIS. Overall, starting with the v7 branch, the tool for removing unnecessary components has gained the ability to remove all unknown executable files—such as those that are not MSI installers.

I don't remember what I added to this branch, as the code is too voluminous. XD

Applications with unsupported uninstallers are skipped instead of being forcefully deleted.

Warning

This action is intentionally aggressive.

If you want to free up even more space, uninstall Visual Studio 2026.

It is designed for disposable GitHub Actions Windows runners.

Do not use it on a personal Windows installation or a persistent server unless you understand what will be removed.

The exact software installed on GitHub-hosted runners can change over time, so the amount of removed software and freed disk space may vary.
