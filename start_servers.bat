@echo off
echo Starting AI Detector Backend (Port 5000)...
start "Backend Server" cmd /k ".\.venv\Scripts\activate.bat && python backend\app.py"

echo Starting Frontend Server (Port 5500)...
start "Frontend Server" cmd /k ".\.venv\Scripts\activate.bat && python -m http.server 5500"

echo Both servers are starting up in new windows!
echo Close those windows to stop the servers later.
