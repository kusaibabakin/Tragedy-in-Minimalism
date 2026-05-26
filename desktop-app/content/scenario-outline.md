# Tragedy in Minimalism — Scenario Outline

## Project
- Start scene: S01
- Total scenes: 64
- Crossfade: 0 ms

## Music
- File: mainpartaudio.mp3
- Start scene: S_NEW_25
- Start at: 0 sec
- Fade in: 10 sec
- Fade out start: 0 sec
- Fade out duration: 0 sec
- Volume: 79%

## Scene Breakdown

### S01 - Активация проекта
- Type: activation
- Video: S01.mp4
- Left choice: ВКЛЮЧИТЬ ТРАНСЛЯЦИЮ -> S_NEW_26

### S_NEW_26
- Type: linear
- Video: S_NEW_26.mp4
- Auto next: S_NEW_27

### S_NEW_27
- Type: linear
- Video: S_NEW_27.mp4
- Auto next: S0

### S0 - Заставка
- Type: linear
- Video: S0.mp4
- Auto next: S1

### S1 - Студия (ведущий + Ленин)
- Type: choice
- Video: S1.mp4
- Left choice:  ГРИБ -> D0
- Right choice:  НЕ ГРИБ -> C0

### D0 - Ленин - гриб
- Type: linear
- Video: D0.mp4
- Auto next: S_NEW_25

### S_NEW_25
- Type: linear
- Video: S_NEW_25.mp4
- Auto next: S2

### S2 - Площадь
- Type: choice
- Video: S2.mp4
- Left choice: о погоде -> D1
- Right choice: о насущном  -> C1

### D1 - Птицы
- Type: choice
- Video: D1.mp4
- Left choice: управлять          -> D2
- Right choice: отпустить -> S_NEW_20

### D2 - Монумент птицы
- Type: linear
- Video: D2.mp4
- Auto next: D3
- Notes: дельтаплан

### D3 - Метро с животными
- Type: choice
- Video: D3.mp4
- Left choice: остаться -> S_NEW_7
- Right choice: снять маски -> S_NEW_13

### S_NEW_7
- Type: linear
- Video: S_NEW_7.mp4
- Auto next: D4

### D4 - Офисы / город
- Type: linear
- Video: D4.mp4
- Auto next: D5

### D5 - прорастающий человек
- Type: choice
- Video: D5.mp4
- Left choice: пустить корни -> D6
- Right choice: открыть дверь -> S_NEW_23

### D6 - ГРиб
- Type: linear
- Video: D6.mp4
- Auto next: N4

### N4 - Разрастающийся гриб
- Type: choice
- Video: N4.mp4
- Left choice: остаться жить -> S_NEW_1
- Right choice: сбежать -> S_NEW_11
- Notes: -мужчина выбегает из грибного здания

### S_NEW_1 - студенты с грибницами
- Type: linear
- Video: S_NEW_1.mp4
- Auto next: D7
- Notes: мир меняется, из аудитории виден ядерный гриб

### D7 - Ядерный гриб
- Type: choice
- Video: D7.mp4
- Left choice: остаться -> D8
- Right choice: сделать фото -> S_NEW_28
- Auto next: D7

### D8 - бабушки в телефонах
- Type: linear
- Video: D8.mp4
- Auto next: N6

### N6 - Человек тащит мусор
- Type: choice
- Video: N6.mp4
- Left choice: копить мусор -> D9
- Right choice: сортировка мусора -> N8

### D9 - бабушки на проводах
- Type: linear
- Video: D9.mp4
- Auto next: F0

### F0 - Финальная студия
- Type: choice
- Video: F0.mp4
- Left choice: бездействовать  -> F1
- Right choice: сомневаться -> F2
- Variant citizen: left: ГРАЖДАНИН: ПРОДОЛЖИТЬ -> F2 | right: ГРАЖДАНИН: ВЫКЛЮЧИТЬ -> F3

### F1 - Концовка: диктатура
- Type: ending
- Video: F1.mp4

### F2 - Концовка: нейтральная
- Type: ending
- Video: F2.mp4

### F3 - Концовка: гражданин
- Type: ending
- Video: F3.mp4

### N8 - Пара в газете
- Type: ending
- Video: N8.mp4
- Notes: поцелуй///переход через телевизор в студии

### S_NEW_28
- Type: linear
- Video: S_NEW_28.mp4
- Auto next: N10

### N10 - селфи  на фоне ядерного гриба
- Type: choice
- Video: N10.mp4
- Left choice: сохранить фото -> S_NEW_16
- Right choice: удалить -> S_NEW_19
- Notes: -человек обрастает мусором | -из телефона вырываются птицы

### S_NEW_16
- Type: linear
- Video: S_NEW_16.mp4
- Auto next: N6

### S_NEW_19
- Type: linear
- Video: S_NEW_19.mp4
- Auto next: C11

### C11 - летящие бабушки
- Type: choice
- Video: C11.mp4
- Left choice: прочитать -> N8
- Right choice: игнорировать -> C10

### C10 - Горящая газета
- Type: linear
- Video: C10.mp4
- Auto next: S_NEW_2
- Notes: переход через телевизор в студии

### S_NEW_2 - финальная студия-ведущий
- Type: choice
- Video: S_NEW_2.mp4
- Left choice: продолжить просмотр -> F2
- Right choice: выключить -> F3

### S_NEW_11
- Type: linear
- Video: S_NEW_11.mp4
- Auto next: S_NEW_24

### S_NEW_24
- Type: linear
- Video: S_NEW_24.mp4
- Auto next: N5

### N5 - девушка в поле
- Type: choice
- Video: N5.mp4
- Left choice: надеть очки -> S_NEW_18
- Right choice: не надевает очки -> S_NEW_17

### S_NEW_18
- Type: linear
- Video: S_NEW_18.mp4
- Auto next: D7

### S_NEW_17
- Type: linear
- Video: S_NEW_17.mp4
- Auto next: C8

### C8 - Закат
- Type: choice
- Video: C8.mp4
- Left choice: сделать селфи -> S_NEW_22
- Right choice: цифровой детокс -> C9
- Notes: -берем телефон | -пространство заполняется цветами

### S_NEW_22
- Type: choice
- Video: S_NEW_22.mp4
- Right choice: N10

### C9 - Счастливые бабушки
- Type: linear
- Video: C9.mp4
- Auto next: C11

### S_NEW_23
- Type: linear
- Video: S_NEW_23.mp4
- Auto next: N3

### N3 - Марионетка
- Type: choice
- Video: N3.mp4
- Left choice: оставить как есть  -> S_NEW_15
- Right choice: обрезать нити -> S_NEW_14

### S_NEW_15
- Type: linear
- Video: S_NEW_15.mp4
- Auto next: N4

### S_NEW_14
- Type: linear
- Video: S_NEW_14.mp4
- Auto next: C6
- Notes: переход

### C6 - девушка лежит в траве
- Type: choice
- Video: C6.mp4
- Left choice: пустить корни -> S_NEW_10
- Right choice: исследовать пространство -> S_NEW_3
- Notes: -пустить корни

### S_NEW_10
- Type: linear
- Video: S_NEW_10.mp4
- Auto next: N5
- Notes: переход

### S_NEW_3 - дорога
- Type: linear
- Video: S_NEW_3.mp4
- Auto next: S_NEW_12

### S_NEW_12
- Type: linear
- Video: S_NEW_12.mp4
- Auto next: C8
- Notes: переход

### S_NEW_13
- Type: linear
- Video: S_NEW_13.mp4
- Auto next: N2
- Notes: переход

### N2 - Тесная комната
- Type: choice
- Video: N2.mp4
- Left choice: остаться -> S_NEW_9
- Right choice: выход -> S_NEW_8

### S_NEW_9
- Type: linear
- Video: S_NEW_9.mp4
- Auto next: D5
- Notes: переход

### S_NEW_8
- Type: linear
- Video: S_NEW_8.mp4
- Auto next: C4
- Notes: переход падение

### C4 - Красная дверь-поле
- Type: choice
- Video: C4.mp4
- Left choice: остаться  -> N3
- Right choice: открыть дверь -> C6

### S_NEW_20
- Type: linear
- Video: S_NEW_20.mp4
- Auto next: N1

### N1 - Метро с манекенами
- Type: choice
- Video: N1.mp4
- Left choice: животное -> D3
- Right choice: человек -> C3

### C3 - Метро с обычными людьми
- Type: choice
- Video: C3.mp4
- Left choice: остаться -> S_NEW_6
- Right choice: выйти -> S_NEW_4

### S_NEW_6
- Type: linear
- Video: S_NEW_6.mp4
- Auto next: N2

### S_NEW_4 - девушка выходит из метро
- Type: linear
- Video: S_NEW_4.mp4
- Auto next: C4

### C1 - Митинг
- Type: choice
- Video: C1.mp4
- Left choice: работать -> S_NEW_21
- Right choice: жить -> C2

### S_NEW_21
- Type: linear
- Video: S_NEW_21.mp4
- Auto next: N1

### C2 - полет
- Type: linear
- Video: C2.mp4
- Auto next: S_NEW_5
- Notes: люди превращаются в птиц

### S_NEW_5
- Type: linear
- Video: S_NEW_5.mp4
- Auto next: C3
- Notes: переход

### C0 - Ленин - не гриб
- Type: linear
- Video: C0.mp4
- Auto next: S_NEW_25

## Branch Summary

- S01 (Активация проекта): ВКЛЮЧИТЬ ТРАНСЛЯЦИЮ -> S_NEW_26
- S_NEW_26: AUTO -> S_NEW_27
- S_NEW_27: AUTO -> S0
- S0 (Заставка): AUTO -> S1
- S1 (Студия (ведущий + Ленин)):  ГРИБ -> D0 |  НЕ ГРИБ -> C0
- D0 (Ленин - гриб): AUTO -> S_NEW_25
- S_NEW_25: AUTO -> S2
- S2 (Площадь): о погоде -> D1 | о насущном  -> C1
- D1 (Птицы): управлять          -> D2 | отпустить -> S_NEW_20
- D2 (Монумент птицы): AUTO -> D3
- D3 (Метро с животными): остаться -> S_NEW_7 | снять маски -> S_NEW_13
- S_NEW_7: AUTO -> D4
- D4 (Офисы / город): AUTO -> D5
- D5 (прорастающий человек): пустить корни -> D6 | открыть дверь -> S_NEW_23
- D6 (ГРиб): AUTO -> N4
- N4 (Разрастающийся гриб): остаться жить -> S_NEW_1 | сбежать -> S_NEW_11
- S_NEW_1 (студенты с грибницами): AUTO -> D7
- D7 (Ядерный гриб): остаться -> D8 | сделать фото -> S_NEW_28 | AUTO -> D7
- D8 (бабушки в телефонах): AUTO -> N6
- N6 (Человек тащит мусор): копить мусор -> D9 | сортировка мусора -> N8
- D9 (бабушки на проводах): AUTO -> F0
- F0 (Финальная студия): бездействовать  -> F1 | сомневаться -> F2
- S_NEW_28: AUTO -> N10
- N10 (селфи  на фоне ядерного гриба): сохранить фото -> S_NEW_16 | удалить -> S_NEW_19
- S_NEW_16: AUTO -> N6
- S_NEW_19: AUTO -> C11
- C11 (летящие бабушки): прочитать -> N8 | игнорировать -> C10
- C10 (Горящая газета): AUTO -> S_NEW_2
- S_NEW_2 (финальная студия-ведущий): продолжить просмотр -> F2 | выключить -> F3
- S_NEW_11: AUTO -> S_NEW_24
- S_NEW_24: AUTO -> N5
- N5 (девушка в поле): надеть очки -> S_NEW_18 | не надевает очки -> S_NEW_17
- S_NEW_18: AUTO -> D7
- S_NEW_17: AUTO -> C8
- C8 (Закат): сделать селфи -> S_NEW_22 | цифровой детокс -> C9
- S_NEW_22: N10
- C9 (Счастливые бабушки): AUTO -> C11
- S_NEW_23: AUTO -> N3
- N3 (Марионетка): оставить как есть  -> S_NEW_15 | обрезать нити -> S_NEW_14
- S_NEW_15: AUTO -> N4
- S_NEW_14: AUTO -> C6
- C6 (девушка лежит в траве): пустить корни -> S_NEW_10 | исследовать пространство -> S_NEW_3
- S_NEW_10: AUTO -> N5
- S_NEW_3 (дорога): AUTO -> S_NEW_12
- S_NEW_12: AUTO -> C8
- S_NEW_13: AUTO -> N2
- N2 (Тесная комната): остаться -> S_NEW_9 | выход -> S_NEW_8
- S_NEW_9: AUTO -> D5
- S_NEW_8: AUTO -> C4
- C4 (Красная дверь-поле): остаться  -> N3 | открыть дверь -> C6
- S_NEW_20: AUTO -> N1
- N1 (Метро с манекенами): животное -> D3 | человек -> C3
- C3 (Метро с обычными людьми): остаться -> S_NEW_6 | выйти -> S_NEW_4
- S_NEW_6: AUTO -> N2
- S_NEW_4 (девушка выходит из метро): AUTO -> C4
- C1 (Митинг): работать -> S_NEW_21 | жить -> C2
- S_NEW_21: AUTO -> N1
- C2 (полет): AUTO -> S_NEW_5
- S_NEW_5: AUTO -> C3
- C0 (Ленин - не гриб): AUTO -> S_NEW_25

## Endings

- N8 - Пара в газете
- F1 - Концовка: диктатура
- F2 - Концовка: нейтральная
- F3 - Концовка: гражданин

## Writing Notes

- Use each scene block as a prose beat.
- Expand scene notes into action, image, and dialogue.
- Use the branch summary to separate alternative scene versions.
- Use the endings list as targets for full linear screenplay drafts.

