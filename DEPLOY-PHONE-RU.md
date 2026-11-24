# Как запустить Искры, подарки и профиль с телефона

Что нужно один раз: выложить функции и правила в Firebase. Приложение собирается в GitHub как раньше.

## Путь 1. Через Google Cloud Shell (без настройки ролей)
1. Откройте console.cloud.google.com в браузере телефона (удобнее в режиме «Версия для ПК»), выберите проект blackgram-35ecf.
2. Вверху справа нажмите значок `>_` (Cloud Shell). Подождите, пока откроется терминал.
3. Меню `⋮` в окне Cloud Shell → Upload → выберите ZIP этой сборки.
4. Выполните по одной команде:

    unzip -o Blackgram_7_9_4_READY.zip && cd bgwork
    npx --yes firebase-tools@14 login --no-localhost
    npm install --prefix functions
    npx --yes firebase-tools@14 deploy --only functions,firestore:rules --project blackgram-35ecf

   При входе откроется ссылка: откройте, войдите в тот же Google-аккаунт, скопируйте код и вставьте в терминал.
5. Если спросит, удалять ли функции, которых нет в коде, ответьте `n`.
6. Если напишет про тариф Blaze, подключите его в Firebase Console (внизу слева «Upgrade»). Для функций он нужен, при вашей нагрузке расход минимальный.

## Путь 2. Деплой одним нажатием из GitHub (удобно на будущее)
1. Firebase Console → Project settings → Service accounts → Generate new private key. Откройте скачанный JSON и скопируйте всё содержимое.
2. GitHub → ваш репозиторий → Settings → Secrets and variables → Actions → New repository secret. Имя `FIREBASE_SERVICE_ACCOUNT`, значение: содержимое JSON.
3. Google Cloud Console → IAM → найдите аккаунт `firebase-adminsdk-...@blackgram-35ecf.iam.gserviceaccount.com` → Edit → добавьте роли: Cloud Functions Admin, Cloud Run Admin, Cloud Scheduler Admin, Service Account User, Artifact Registry Administrator, Cloud Build Editor.
4. GitHub → Actions → Deploy Firebase → Run workflow.
Если деплой упадёт с ошибкой про права, пришлите текст ошибки: по нему видно, какой роли не хватает.

## Проверка
- Firebase Console → Functions: есть claimDaily, sendGift, adminGrantSparks, у всех среда Node.js 22.
- Firebase Console → Firestore → Rules: обновлено время публикации.
- В приложении при входе всплывает «+100 Искр», в профиле видно «Искры: 100».
- Владелец: админка → вкладка «Искры» → начислить.
- Фото профиля: из галереи, сохраняется маленькой копией прямо в профиле (Firebase Storage сейчас выключен в приложении).
