<div align="center">

<img src="https://assets.nhle.com/logos/nhl/svg/NHL_light.svg" alt="NHL" width="120" />

# 🏒 NHL Stats Dashboard

**Быстрое, красивое и бесплатное десктопное приложение для фанатов НХЛ**

[![Версия](https://img.shields.io/badge/версия-1.4.3-blue?style=for-the-badge)](https://github.com/Praxideke/nhl-dashboard/releases)
[![Платформа](https://img.shields.io/badge/платформа-Windows-0078D6?style=for-the-badge&logo=windows)](https://github.com/Praxideke/nhl-dashboard/releases)
[![Лицензия](https://img.shields.io/badge/лицензия-MIT-green?style=for-the-badge)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Praxideke/nhl-dashboard?style=for-the-badge&color=yellow)](https://github.com/Praxideke/nhl-dashboard/stargazers)

[**⬇️ Скачать для Windows**](https://github.com/Praxideke/nhl-dashboard/releases) · [**🐛 Сообщить об ошибке**](https://github.com/Praxideke/nhl-dashboard/issues) · [**💡 Предложить идею**](https://github.com/Praxideke/nhl-dashboard/issues)

</div>

---

## 📸 Превью

<div align="center">

<img width="1920" height="1040" alt="main" src="https://github.com/user-attachments/assets/0e53e3e1-9503-4359-b36f-0106d3fc1337" />

</div>

---

## ✨ Что внутри

<table>
<tr>
<td width="50%">

### 📊 Таблица (Standings)
- 4 режима: Дивизион / Конференция / Wild Card / Общая
- Форма за 5 матчей (кружочки W-L-OTL с тултипами)
- Следующий матч с логотипом соперника
- Историческая таблица на любую дату

</td>
<td width="50%">

### 🎮 Детали матча
- Счёт и статус в реальном времени
- ⭐ **Три звезды матча**
- Авторы голов по периодам (3 периода + OT/SO)
- 8 параметров статистики: Броски, Силовые, Вбрасывания, Большинство, Штрафные, Потери, Отборы, Блоки
- Буллиты с реальным финальным счётом

</td>
</tr>
<tr>
<td width="50%">

### 🏆 Лидеры лиги
- Топ-5 по Голам, Передачам, Очкам
- Вратари: Победы, GAA, SV%, Шатауты
- Строгий фильтр: минимум 10 игр
- Клик по игроку → полная карточка

</td>
<td width="50%">

### 👤 Карточки игроков
- Био, данные драфта, история клубов
- Статистика по сезонам и за карьеру
- Бейдж травмы
- Отметка «Завершил карьеру»
- Режим сравнения игроков

</td>
</tr>
</table>

---

## 🖼️ Скриншоты

<div align="center">

### Детали матча и Три звезды
<img width="1813" height="901" alt="details" src="https://github.com/user-attachments/assets/a548a95a-db4d-468d-bffe-b5d337954f01" />

### Лидеры лиги
<img width="1920" height="1040" alt="leaders" src="https://github.com/user-attachments/assets/6269791c-662b-4079-9f22-b89136fe159f" />

### Карточка игрока
<img width="1029" height="961" alt="player" src="https://github.com/user-attachments/assets/06f6d2e5-9c8b-4bbf-ab7a-d466eef8997c" />

</div>

---

## 🚀 Установка

### Готовый установщик (Windows)
1. Перейди на страницу [**Releases**](https://github.com/Praxideke/nhl-dashboard/releases)
2. Скачай последний файл `NHL Dashboard Setup X.X.X.exe`
3. Запусти установщик и открой приложение
4. Готово — никаких зависимостей не требуется

### Сборка из исходников (все платформы)

Клонируй репозиторий и установи зависимости:

    git clone https://github.com/Praxideke/nhl-dashboard.git
    cd nhl-dashboard
    npm install

Запуск в режиме разработки (потребуется 3 терминала):

    npm run dev:api      # бэкенд на :3001
    npm run dev:web      # фронтенд на :5173
    npm run electron:dev # оболочка Electron

Сборка релиза:

    npm run package      # создаёт .exe в папке /release

---

## 🛠️ Технологии

<div align="center">

| **Фронтенд** | **Бэкенд** | **Оболочка** | **Данные** |
|:---:|:---:|:---:|:---:|
| React 18 | Node.js | Electron | ESPN API |
| Vite | Fastify | TypeScript | NHL API |
| TypeScript | In-memory кэш | — | — |

</div>

---

## 🌍 Языки

- 🇷🇺 Русский (по умолчанию)
- 🇬🇧 English

Переключение в один клик кнопками **RU / EN** в шапке приложения.

---

## 📋 Планы развития

- [ ] Сборки для macOS и Linux
- [ ] Экспорт статистики в картинку (для соцсетей)
- [ ] Уведомления о матчах любимой команды
- [ ] Светлая / тёмная тема
- [ ] Расширенная история плей-офф

Есть идея? [Создай issue](https://github.com/Praxideke/nhl-dashboard/issues).

---

## 🤝 Участие в разработке

Pull requests, баг-репорты и предложения фич — приветствуются!
Загляни в раздел [issues](https://github.com/Praxideke/nhl-dashboard/issues).

---

## 📄 Лицензия

MIT — свободно для использования, изменения и распространения.

---

<div align="center">

**Сделано с ❤️ для фанатов хоккея**

⭐ **Если тебе нравится проект — поставь звезду!** ⭐

</div>
