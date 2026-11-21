BLACKGRAM 6.0 — MEGA UPDATE

Это обновлённая веб/PWA-версия Blackgram 6.0 на основе проекта 5.3.2. Существующий интерфейс и старые функции сохранены. В меню добавлен раздел «🚀 Mega Center 6.0» с 30 новыми возможностями.

ПУБЛИКАЦИЯ
1. Распакуй архив.
2. Загрузи содержимое папки bgwork в корень репозитория, сохранив структуру.
3. В Firebase Console проверь Authentication (Email/Password), Firestore и Storage.
4. После проверки правил выполни из корня проекта: firebase deploy --only firestore:rules,functions
5. Для отложенной отправки активируй Cloud Scheduler/Cloud Functions и подходящий платёжный план Google Cloud.
6. Открой сайт и найди «🚀 Mega Center 6.0» в меню Blackgram.

ПРОВЕРКИ И ОГРАНИЧЕНИЯ
См. BLACKGRAM-6.0-MEGA-RU.md — там перечислены все 30 возможностей, обязательные настройки и функции, которым требуется отдельный backend или поддержка устройства. Локальные автотесты запускаются командой: node --test tests/blackgram-6.test.js

Не публикуй Firestore Rules без проверки в Firebase Emulator/Rules Playground. Реальные Firebase-запросы, Cloud Scheduler, APK и работу на телефоне в этой сборке ещё нужно проверить после развёртывания.
