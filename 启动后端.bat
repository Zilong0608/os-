@echo off
echo ================================
echo   Mirror Studio - CVfoR1
echo   启动后端 API 服务器
echo ================================
echo.

echo [1/2] 激活虚拟环境...
call .venv\Scripts\Activate.ps1 2>nul
if %errorlevel% neq 0 (
    call .venv\Scripts\activate.bat
)

echo.
echo [2/2] 启动后端服务...
echo API 将在 http://localhost:8000 启动
echo Swagger 文档: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

uvicorn apps.api.main:app --reload --port 8000

