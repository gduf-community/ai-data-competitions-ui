$ErrorActionPreference = "Stop"

$repoRoot = Get-Location
Write-Host "Applying open-source documentation update to $repoRoot"

Copy-Item -Path "README.md" -Destination "$repoRoot\README.md" -Force
New-Item -ItemType Directory -Path "$repoRoot\docs\assets" -Force | Out-Null
Copy-Item -Path "docs\功能介绍.md" -Destination "$repoRoot\docs\功能介绍.md" -Force
Copy-Item -Path "docs\开源协作指南.md" -Destination "$repoRoot\docs\开源协作指南.md" -Force
Copy-Item -Path "docs\assets\brand-banner.svg" -Destination "$repoRoot\docs\assets\brand-banner.svg" -Force
Copy-Item -Path "docs\assets\preview-home.svg" -Destination "$repoRoot\docs\assets\preview-home.svg" -Force
Copy-Item -Path "docs\assets\preview-competitions.svg" -Destination "$repoRoot\docs\assets\preview-competitions.svg" -Force
New-Item -ItemType Directory -Path "$repoRoot\.github\ISSUE_TEMPLATE" -Force | Out-Null
Copy-Item -Path ".github\PULL_REQUEST_TEMPLATE.md" -Destination "$repoRoot\.github\PULL_REQUEST_TEMPLATE.md" -Force
Copy-Item -Path ".github\ISSUE_TEMPLATE\bug_report.yml" -Destination "$repoRoot\.github\ISSUE_TEMPLATE\bug_report.yml" -Force
Copy-Item -Path ".github\ISSUE_TEMPLATE\feature_request.yml" -Destination "$repoRoot\.github\ISSUE_TEMPLATE\feature_request.yml" -Force

Write-Host "Done. Suggested check: git diff -- README.md docs .github"
