NHL DASHBOARD — РУКОВОДСТВО ПО УСТАНОВКЕ

Объединённая статистика NHL: таблица в стиле Sportsnet + лента матчей в стиле 365Scores.


ЧТО НУЖНО ПЕРЕД УСТАНОВКОЙ

Node.js 20 или новее. Скачать: https://nodejs.org/ (LTS-версия).

Проверить после установки:

    node -v

Должно показать v20.x.x или выше.


УСТАНОВКА НА НОВОМ ПК

Пример: проект устанавливается в D:\NHL.

ШАГ 1. Распакуйте архив

Распакуйте NHL-dashboard.zip так, чтобы получилась папка D:\NHL\. Внутри должно быть:

    D:\NHL\
    ├─ package.json
    ├─ package-lock.json
    ├─ tsconfig.base.json
    ├─ start.bat
    ├─ README.txt
    ├─ apps\
    └─ packages\

Не должно быть так: D:\NHL\NHL-dashboard\package.json — это лишняя вложенность.

ШАГ 2. Установите зависимости

Откройте PowerShell и выполните:

    cd D:\NHL
    npm install

Установка занимает 30-60 секунд и ставит ~120 пакетов сразу для трёх частей проекта.

Если увидите "added 84 packages" или больше — всё ок.
Если "No workspaces found!" — вы не в корне проекта.

ШАГ 3. Запустите

Двойной клик на start.bat в D:\NHL\.

Откроются:
- окно PowerShell с бэкендом (порт 3001)
- окно PowerShell с фронтендом (порт 5173)
- браузер с приложением на http://localhost:5173

Через 8-10 секунд после запуска страница загрузится с данными.

ШАГ 4. Остановка

Закройте оба окна PowerShell (бэкенд и фронтенд).


РУЧНОЙ ЗАПУСК (БЕЗ start.bat)

Нужны два отдельных окна PowerShell.

Окно 1 — бэкенд:

    cd D:\NHL
    npm run dev:api

Дождитесь строки: API is running on http://localhost:3001

Окно 2 — фронтенд:

    cd D:\NHL
    npm run dev:web

Дождитесь строки: Local: http://localhost:5173/

Откройте в браузере http://localhost:5173.


ПРОБЛЕМЫ И РЕШЕНИЯ

Ошибка "listen EADDRINUSE: address already in use 0.0.0.0:3001"
Порт 3001 занят старым процессом. Освободите:

    Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id  -Force }

То же для порта 5173 (замените 3001 на 5173).

Ошибка "No workspaces found!"
npm install запущен не из корня. Перейдите в D:\NHL и повторите.

Ошибка "Cannot find module '@nhl/shared'"
Удалите node_modules и package-lock.json, установите заново:

    cd D:\NHL
    Remove-Item -Recurse -Force node_modules
    Remove-Item -Force package-lock.json
    npm install

Ошибка "standings 502" в браузере
Бэкенд не работает. Смотрите окно с npm run dev:api — там должна быть ошибка.

Ошибка "fetch is not defined"
Node.js старше 18. Обновите до 20+.


ПЕРЕНОС ПРОЕКТА НА ДРУГОЙ ПК

Перед архивированием удалите node_modules:

    cd D:\NHL
    Remove-Item -Recurse -Force node_modules
    Remove-Item -Recurse -Force apps\api\node_modules -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force apps\web\node_modules -ErrorAction SilentlyContinue

Затем заархивируйте:

    Compress-Archive -Path D:\NHL -DestinationPath D:\NHL-dashboard.zip -Force

На новом ПК: распакуйте архив и повторите установку с Шага 1.
