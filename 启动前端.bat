@echo off
echo ================================
echo   Mirror Studio - CVfoR1
echo   启动前端开发服务器
echo ================================
echo.

cd apps\ui

echo [1/2] 检查依赖...
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    call npm install
) else (
    echo 依赖已安装，跳过。
)

echo.
echo [2/2] 启动开发服务器...
echo 前端将在 http://localhost:3000 启动
echo.
echo 按 Ctrl+C 停止服务器
echo ================================
echo.

call npm run dev

