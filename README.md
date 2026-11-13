<img width="1029" height="961" alt="player" src="https://github.com/user-attachments/assets/06f6d2e5-9c8b-4bbf-ab7a-d466eef8997c" />
<img width="1813" height="901" alt="details" src="https://github.com/user-attachments/assets/a548a95a-db4d-468d-bffe-b5d337954f01" />
<img width="1920" height="1040" alt="leaders" src="https://github.com/user-attachments/assets/6269791c-662b-4079-9f22-b89136fe159f" />
<img width="1920" height="1040" alt="main" src="https://github.com/user-attachments/assets/0e53e3e1-9503-4359-b36f-0106d3fc1337" />
# NHL Stats

Десктопное приложение с полной статистикой NHL: турнирная таблица, матчи, плей-офф, лидеры, карточки команд и игроков.

## 📥 Скачать

Готовые сборки для Windows (установщик и портативная версия) находятся в разделе [Releases](https://github.com/Praxideke/nhl-dashboard/releases/latest).

Node.js не требуется, всё упаковано внутри `.exe`. Для загрузки данных (через ESPN API) нужен интернет.

## ✨ Возможности

*   **Таблица:** Разбивка по Division / Conference / Wild Card / Overall; форма Last 5 с тултипами; индикаторы клинча (x/y/z); фильтр по дате; выбор сезона с 2014 по 2027.
*   **Матчи:** Сегодняшние игры и расписание. Детали матча: броски, авторы голов с фото, три звезды, арена, посещаемость, статус периода в live-режиме.
*   **Плей-офф:** Визуальная сетка (Западная / Восточная конференции, Кубок Стэнли по центру).
*   **Лидеры:** Топ-5 полевых (Очки, Голы, Передачи) и вратарей (Победы, SV%, GAA, Сухие игры).
*   **Команды:** Лидеры команды, полный состав с травмами (IR / OUT / DTD), последние и будущие игры.
*   **Игроки:** Текущая статистика, карьера, история клубов по сезонам, био, статус травмы. Поиск и сравнение игроков.
*   **Интерфейс:** Тёмная тема, полная локализация RU / EN.

## 🛠 Для разработчиков

**Требования:** Node.js 20+, Windows (PowerShell).

```powershell
git clone https://github.com/Praxideke/nhl-dashboard.git
cd nhl-dashboard
npm install
```

**Запуск в режиме разработки (3 терминала):**
```powershell
npm run dev:api       # Терминал 1 (бэкенд)
npm run dev:web       # Терминал 2 (Vite)
npm run electron:dev  # Терминал 3 (Electron)
```

**Сборка релиза:**
```powershell
npm run package       # Создаст .exe в папке release/
```
