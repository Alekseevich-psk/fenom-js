import { render } from '../src/index.js';

const template = `Hello {$name} more def value {$test}`;
// const template = `Hello {$name}`;

const result = render(template, {
    name: "Alice",
    user: true
});

// console.log(result); // Должно быть: "Hello Alice! You are logged in."