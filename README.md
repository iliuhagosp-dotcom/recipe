# Blackgram 6.0 — Mega Update

Основной проект — Firebase Web/PWA и Capacitor Android/iOS wrapper. Сборка 6.0.0 основана на Blackgram 5.3.2 и сохраняет существующий интерфейс и функции.

- В меню добавлен **🚀 Mega Center 6.0** с 30 новыми возможностями.
- Обновлены `index.html`, `public/index.html` и `www/index.html`.
- Добавлена серверная доставка отложенных сообщений в `functions/index.js`.
- Добавлены Firestore Rules для новых приватных и общих коллекций.
- Добавлены локальные автотесты: `node --test tests/blackgram-6.test.js`.

## Firebase deployment

```bash
firebase deploy --only firestore:rules,functions
```

Отложенная отправка использует Cloud Functions v2 Scheduler. Требуется доступность Cloud Scheduler и соответствующий платёжный план проекта. Перед публикацией проверь правила в Firebase Emulator/Rules Playground.

Подробное описание всех 30 пунктов, ограничений и ручных проверок: [BLACKGRAM-6.0-MEGA-RU.md](BLACKGRAM-6.0-MEGA-RU.md).
