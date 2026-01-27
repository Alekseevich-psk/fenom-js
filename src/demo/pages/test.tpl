<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>

<body>
    <section class="i-catalog i-wrap">
        <h2>Приобрести оборудование</h2>
        <div class="wrap-catalog">

           {foreach $cat.list as $item}
            <div class="wrapper">
                <div class="wrap-view">
                    <h3>{$item.pagetitle}</h3><img src="img/picture.png" alt="" />
                </div>
       
                {if $item.avaible == '1'}
                <p class="catalog__exist">В наличии</p>
                {/if}

                <p class="i-desc">{$item.description}</p>
                <div class="wrap-item">
                    <p class="price">{$item.price} </p>
                </div>
                <div class="align"><a class="btn-product" href="#">Подробнее </a></div>
            </div>
            {/foreach}

        </div>
        <div class="align"> <a class="btn sectionBtn" href="#">Перейти в каталог </a></div>
    </section>
</body>

</html>