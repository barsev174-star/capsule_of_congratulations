# Как тестировать текущую версию

## Что уже можно тестировать

После `Блока 3` можно вручную проверить:

1. Главную страницу.
2. Экран создания открытки.
3. Валидацию формы.
4. Выбор шаблона.
5. Создание черновика.
6. Появление ссылки для участников.
7. Появление ссылки управления.
8. Генерацию текста для чата.
9. Открытие ссылки участника.
10. Отправку поздравления.
11. Появление поздравления в списке на странице участника.
12. Работу AI-помощника для черновика поздравления.
13. Секретную страницу организатора.
14. Скрытие и удаление поздравлений.

## Как запустить проект

В PowerShell:

```powershell
cd "C:\Project\Поздравления"
npm.cmd run dev
```

После запуска открыть в браузере:

`http://localhost:3000`

## Что проверить руками

1. На главной есть переход к созданию открытки.
2. Форма понятна без объяснений.
3. Если отправить пустую форму, показываются понятные ошибки.
4. Если заполнить форму корректно, появляется блок с результатом.
5. После создания видны:
   - ссылка участника;
   - ссылка управления;
   - выбранный шаблон;
   - текст для отправки в чат.
6. Если открыть ссылку участника, отображается экран сбора поздравлений.
7. Если отправить пустое или слишком короткое поздравление, показываются ошибки.
8. Если отправить корректное поздравление, появляется сообщение об успехе.
9. После обновления страницы отправленное поздравление видно в списке.
10. Если ввести слишком пустой текст вроде `Поздравляю!`, форма теперь должна ругаться.
11. Если открыть AI-помощника, заполнить поля и нажать генерацию, должны появиться 3 варианта текста.
12. Если выбрать один из вариантов, он должен подставиться в поле поздравления.
13. Если открыть ссылку управления, должен появиться список поздравлений.
14. Если скрыть поздравление, оно должно исчезнуть с публичной страницы участника.
15. Если вернуть поздравление в `visible`, оно снова должно появиться на публичной странице.
16. Если удалить поздравление, оно должно остаться только как удаленное в управлении и пропасть из публичного списка.

## Что пока ожидаемо не готово

1. AI пока не является частью обязательного MVP-flow.
2. Оплата и публикация по тарифу еще не реализованы.
3. Регистрация и полноценная админка сервиса еще не реализованы.
4. Хранение пока локальное, не в базе данных.
5. “Спасибо” на финальной открытке пока локальная реакция, без отправки организатору.
## Update 2026-06-14

Check the new manage flow:

1. The landing page clearly leads into card creation.
2. Starting creation opens the manage page directly.
3. `Основа открытки` can be filled and corrected without going back.
4. Optional blocks can be removed from their cards.
5. Removed blocks appear in a restore zone below.
6. The `Поздравления` card changes the grid and updates the preview scheme.
7. Template selection happens after structure, not before it.
8. Participant AI still uses `occasionText` rather than a visible legacy category.
 
## Update 2026-06-15

Manual checks for the current manage editor:

1. Open the organizer manage page and switch between `Оформление открытки` and `Поздравления и фото`.
2. In `Оформление открытки`, drag a non-fixed composition block by its handle:
   - the block should feel attached to the handle;
   - `Обложка` and `Финал` should not be draggable;
   - the insertion line should show where the block will land.
3. In `Поздравления и фото`, expand a contribution and toggle it from active to hidden:
   - the card should collapse;
   - the card should move to the end of the list;
   - the badge should become red `Скрыто`;
   - after refresh, the card should still be hidden and stay in the hidden group.
4. Toggle a hidden contribution back to active:
   - the card should collapse if it was open;
   - it should move to the end of the active group, before hidden cards;
   - the badge should become green `Активно`;
   - after refresh, the order should remain the same.
5. Use the category filters:
   - `Все` shows all cards;
   - `Активные` shows active cards only;
   - `Скрытые` shows hidden cards only;
   - `Слишком длинные` shows cards above the current character limit;
   - `Без роли` shows cards without participant role.
6. Drag a contribution by its handle:
   - the card should feel attached to the handle, not to the center;
   - the insertion point should be visible before drop;
   - saving the order should keep it after refresh.
7. Confirm that hidden contributions do not appear on participant/public visible surfaces.
8. Click `Добавить вручную`, add a valid author and message, and confirm the new contribution appears in the moderation list after submit.
9. Open the overflow menu next to `Добавить вручную` and confirm participant link and invitation text can be copied.

## Update 2026-06-22 MVP-flow checks

Manual checks for the current MVP-flow:

1. Open the organizer manage page.
2. Confirm the hero panel shows:
   - current lifecycle status;
   - participant link;
   - organizer link;
   - recipient/final link.
3. Copy each link and confirm the copied value opens from the browser address bar.
4. Change status to `Сбор закрыт`.
5. Open the participant link and confirm the form is replaced by the closed-state message.
6. Try posting to `/api/contributions` for the closed card and confirm it returns an error.
7. Change status back to `Сбор поздравлений` and confirm the participant form is visible again.
8. Open the final gift link.
9. Click `Спасибо, очень приятно!` and confirm a local confirmation message appears.
10. Click `Сохранить открытку` and confirm the browser print/save dialog opens.
11. Click `Создать такую же открытку` and confirm it navigates to `/create`.
12. Upload up to 6 photos and confirm the next new upload is rejected with a clear limit message.
13. Replace an existing photo after the 6-photo limit and confirm replacement still works.

## Update 2026-06-23 Postgres and new draft checks

Manual checks added after the storage preparation pass:

1. Open `/` and click `Создать открытку`.
2. Confirm the opened manage page is a new empty draft and does not show demo values like `Кристина` or `Евсей`.
3. Fill the basics form and confirm the manage header, participant page, and final preview use the saved values.
4. Without `DATABASE_URL`, confirm local JSON storage still works.
5. With `DATABASE_URL`, run `npm run db:migrate` and repeat the same create/manage/participant/final flow on PostgreSQL.
