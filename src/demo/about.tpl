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
            {set $name = 'about.html'} {include 'header.tpl'}
            <h1>Hello, {$name}</h1>

            <a href="/">index.html</a>
        </div>
    </main>

    <script type="module" src="/src/main.ts"></script>
</body>

</html>