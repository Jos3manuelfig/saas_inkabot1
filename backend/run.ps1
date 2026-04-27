Set-Location $PSScriptRoot
& "$PSScriptRoot\.venv\Scripts\activate.ps1"
& "$PSScriptRoot\.venv\Scripts\uvicorn.exe" app.main:app --reload --port 8003
