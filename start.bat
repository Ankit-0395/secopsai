@echo off
echo Starting SecureOpsAI...

start cmd /k "cd /d C:\Users\Ankit Kumar\Desktop\secure\SecureOpsAI\backend && venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000"

timeout /t 3

start cmd /k "cd /d C:\Users\Ankit Kumar\Desktop\secure\SecureOpsAI\frontend && npm start"

timeout /t 5
start http://localhost:3000