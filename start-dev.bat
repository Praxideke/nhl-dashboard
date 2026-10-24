@echo off
echo Starting NHL Dashboard Development Environment...
start cmd /k "cd /d E:\AI\NHL && npm run dev:api"
start cmd /k "cd /d E:\AI\NHL && npm run dev:web"
