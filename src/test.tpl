{* ========================================
Шаблон: index.tpl
Демонстрация всех возможностей Fenom
======================================== *}

<!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title|default:'Главная страница'|escape}</title>
    <style>
        .user-card {
            border: 1px solid #ddd;
            padding: 10px;
            margin: 10px 0;
        }

        .highlight {
            background: yellow;
        }
    </style>
</head>

<body>

    {* -------------------------------
    1. Переменные и фильтры
    ------------------------------- *}

    <h1>Привет, {$user.name|upper}!</h1>
    <p>Возраст: {$user.age}</p>
    <p>Email: {$user.email|lower}</p>
    <p>Дата регистрации: {$user.joined|date:'d.m.Y'}</p>
    <p>Описание: {$user.bio|truncate:100:'...'}</p>

    {* Экранирование *}
    <p>Сырой HTML: {$user.bio|safe}</p> {* |safe — отключает экранирование *}

    {* Условное экранирование *}
    <p>Статус: {if $user.active}Активен{else}Неактивен{/if}</p>


    {* -------------------------------
    2. Установка переменных
    ------------------------------- *}

    {set $greeting = 'Добро пожаловать'}
    {set $counter = 0}

    {* var — только если не существует *}
    {var $theme = 'light'}
    {var $theme = 'dark'} {* не изменится *}

    <p>Тема: {$theme}</p>


    {* -------------------------------
    3. Условия
    ------------------------------- *}

    {if $user.role == 'admin'}
    <p class="highlight">Вы — администратор!</p>
    {elseif $user.role == 'moderator'}
    <p>Вы — модератор</p>
    {else}
    <p>Вы — обычный пользователь</p>
    {/if}

    {* Короткая форма *}
    {if $showHelp}<div>Справка: нажмите F1</div>{/if}


    {* -------------------------------
    4. Циклы
    ------------------------------- *}

    <h2>Список друзей:</h2>
    {if $user.friends}
    <ul>
        {each $user.friends as $friend}
        <li>{$friend.index + 1}. <a href="/user/{$friend.id}">{$friend.name}</a></li>
        {/each}
    </ul>
    {else}
    <p>Нет друзей</p>
    {/if}

    {* Цикл с ключом *}
    {each $settings as $key => $value}
    <p><strong>{$key}:</strong> {$value}</p>
    {/each}


    {* -------------------------------
    5. Инкремент / Декремент
    ------------------------------- *}

    {add $counter++}
    {add $counter += 5}
    <p>Счётчик: {$counter}</p>
    {add $counter--}
    <p>После уменьшения: {$counter}</p>


    {* -------------------------------
    6. include — включение шаблонов
    ------------------------------- *}

    <div class="user-card">
        {include 'partials/user-card.tpl' with {
        user: $user,
        showAvatar: true,
        size: 'large'
        }}
    </div>

    {include 'partials/footer.tpl'}


    {* -------------------------------
    7. Макросы (если поддерживается)
    ------------------------------- *}

    {macro input(name, type="text", value="")}
    <label for="{$name}">{$name|capitalize}:</label>
    <input type="{$type}" name="{$name}" id="{$name}" value="{$value}">
    {/macro}

    {* Использование макроса *}
    {call input(name='email', type='email', value=$user.email)}
    {call input('phone')}


    {* -------------------------------
    8. Выражения и математика
    ------------------------------- *}

    {set $total = $price * $quantity + $tax}
    <p>Итого: {$total|number_format:2}</p>


    {* -------------------------------
    9. Встроенные переменные
    ------------------------------- *}

    <p>Текущая страница: {$request.url}</p>
    <p>Время: {$smarty.now|date:'H:i:s'}</p>


    {* -------------------------------
    10. Комментарии (не попадают в вывод)
    ------------------------------- *}

    {* Это комментарий в шаблоне *}

    <!-- Это HTML-комментарий (попадёт в вывод) -->


    {* -------------------------------
    11. Логика: цикл с условием
    ------------------------------- *}

    {each $items as $item}
    {if $item.active}
    <div class="item active">{$item.title}</div>
    {else}
    <div class="item inactive">{$item.title} (неактивно)</div>
    {/if}
    {/each}


    {* -------------------------------
    12. Массивы и вложенные данные
    ------------------------------- *}

    <p>Город: {$user.address.city}</p>
    <p>Телефон: {$user.contacts.0}</p>


    {* -------------------------------
    13. Проверка значений
    ------------------------------- *}

    {if !empty($user.phone)}
    <p>Телефон: {$user.phone}</p>
    {/if}

    {if isset($user.subscription)}
    <p>Подписка: {$user.subscription.plan}</p>
    {/if}


    {* -------------------------------
    14. Расширения (если есть)
    ------------------------------- *}

    {* Например, поддержка JSON *}
    <p>Данные: {$debugData|json_encode}</p>

    {* Поддержка URL *}
    <a href="{$urls.profile|replace:'/user/':'/profile/'}">Профиль</a>


</body>

</html>