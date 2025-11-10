@echo off

pip install pyinstaller

pyinstaller --onefile ^
  --name app ^
  --add-data "database;database" ^
  --add-data "api;api" ^
  --add-data "services;services" ^
  --hidden-import=uvicorn ^
  --hidden-import=fastapi ^
  app.py

echo Backend built successfully!