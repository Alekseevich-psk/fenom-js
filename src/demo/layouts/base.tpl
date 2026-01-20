<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{block "title"}Заголовок по умолчанию{/block}</title>
    <link rel="stylesheet" href="src/demo/styles/style.css" />
    <link rel="icon" href="/svg/ico-favicon.svg" type="image/svg+xml">
</head>

<body>
    <main>
        <div class="cont">
            {block "main"}
            {/block}
        </div>
    </main>

    <script type="module" src="/scripts/main.ts"></script>
    <script type="module" src="/scripts/test.ts"></script>
</body>

</html>