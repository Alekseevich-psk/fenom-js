export declare const filters: {
    /**
     * Преобразует строку в верхний регистр
     */
    upper: (s: any) => string;
    /**
     * Преобразует строку в нижний регистр
     */
    lower: (s: any) => string;
    /**
     * Делает первую букву строки заглавной, остальные — строчными
     * 'аННА' → 'Анна'
     */
    capitalize: (s: any) => string;
    /**
     * Аналог capitalize (для совместимости)
     */
    ucfirst: (s: any) => string;
    /**
     * Делает первую букву каждого слова заглавной
     * 'hello world' → 'Hello World'
     */
    ucwords: (s: any) => string;
    /**
     * Делает первую букву строки строчной
     * 'Hello' → 'hello'
     */
    lcfirst: (s: any) => string;
    /**
     * Удаляет пробелы с краёв строки
     */
    trim: (s: any) => string;
    /**
     * Удаляет пробелы слева
     */
    ltrim: (s: any) => string;
    /**
     * Удаляет пробелы справа
     */
    rtrim: (s: any) => string;
    /**
     * Преобразует \n → <br>
     */
    nl2br: (s: any) => string;
    /**
     * Заменяет подстроку
     * {$str|replace:'old':'new'}
     */
    replace: (s: any, search: string, replace: string) => string;
    /**
     * Обрезает строку
     * {$str|substr:0:5}
     */
    substr: (s: any, start: number, length?: number) => string;
    /**
     * Кодирует строку в URL
     */
    urlencode: (s: any) => string;
    /**
     * Декодирует URL
     */
    urldecode: (s: any) => string;
    /**
     * Экранирует HTML-символы
     */
    escape: (s: any) => string;
    /**
     * Синоним escape
     */
    e: (s: any) => string;
    /**
     * Первый элемент массива/объекта
     */
    first: (arr: any) => any;
    /**
     * Последний элемент массива/объекта
     */
    last: (arr: any) => any;
    /**
     * Объединяет массив в строку
     * {$arr|join:', '}
     */
    join: (arr: any, separator?: string) => string;
    /**
     * Переворачивает массив или строку
     */
    reverse: (arr: any) => any;
    /**
     * Сортирует массив по значениям
     */
    sort: (arr: any) => any;
    /**
     * Сортирует массив по ключам
     */
    ksort: (obj: any) => any;
    /**
     * Возвращает только уникальные значения
     */
    unique: (arr: any) => any;
    /**
     * Перемешивает массив
     */
    shuffle: (arr: any) => any;
    /**
     * Возвращает срез массива/строки
     * {$arr|slice:0:2}
     */
    slice: (arr: any, start: number, length?: number) => any;
    /**
     * Объединяет два массива
     * {$arr1|merge:$arr2}
     */
    merge: (arr1: any, arr2: any) => any;
    /**
     * Разбивает массив на группы
     * {$items|batch:3}
     */
    batch: (arr: any, size: number) => any;
    /**
     * Возвращает ключи массива/объекта
     */
    keys: (obj: any) => string[];
    /**
     * Возвращает значения массива/объекта
     */
    values: (obj: any) => unknown[];
    /**
     * Длина строки или количество элементов
     */
    length: (arr: any) => number;
    /**
     * Форматирует число
     * {$price|number_format:2:'.':','}
     */
    number_format: (num: any, decimals?: number, decPoint?: string, thousandsSep?: string) => string;
    /**
     * Абсолютное значение
     */
    abs: (n: any) => number;
    /**
     * Округляет число
     */
    round: (n: any, precision?: number) => number;
    /**
     * Кодирует в JSON
     */
    json_encode: (data: any) => string;
    /**
     * Декодирует из JSON
     */
    json_decode: (str: any) => any;
    /**
     * Форматирует timestamp
     * Формат: d.m.Y H:i:s
     */
    date: (timestamp: any, format?: string) => string;
    /**
     * Возвращает значение по умолчанию, если пусто
     */
    default: (s: any, def: string) => any;
    /**
     * Вывод без изменений
     */
    raw: (s: any) => any;
    /**
     * Отладка: вывод структуры
     */
    var_dump: (data: any) => string;
    /**
     * Отладка: красивый вывод
     */
    print_r: (data: any) => string;
};
