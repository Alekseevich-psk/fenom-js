<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fenom-js</title>
    <link rel="stylesheet" href="/src/style.css" />
</head>

<body>
    <main>
        <div class="cont">
            <h1>Test!</h1>
            {set $name = 'Анна'} {include 'header.tpl'}

            <h1>Hello, {$name}!!</h1>

            {if $isAdmin}
            <p>Добро пожаловать, админ!</p>
            {else}
            <p>Привет, пользователь!</p>
            {/if}

            <ul>
                {foreach $user in $users}
                <li>{$user.name} ({$user.age})</li>
                {/foreach}
            </ul>
        </div>
    </main>

    <script type="module" src="/src/main.ts"></script>
</body>

</html>