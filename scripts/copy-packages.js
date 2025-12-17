import fs from 'node:fs';
import path from 'node:path';

const packages = [
  {
    src: path.resolve('src/fenom-js/package.json'),
    dest: path.resolve('fenom-js/package.json'),
  },
  {
    src: path.resolve('readme.md'),
    dest: path.resolve('fenom-js/readme.md'),
  },
  {
    src: path.resolve('src/vite-plugin-fenom/package.json'),
    dest: path.resolve('vite-plugin-fenom/package.json'),
  },
  {
    src: path.resolve('readme.md'),
    dest: path.resolve('vite-plugin-fenom/readme.md'),
  }
];

function copyPackage(src, dest) {
  try {
    const destDir = path.dirname(dest);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(src, dest);
    console.log(`✅ Скопирован: ${src}`);
    console.log(`   → в: ${dest}`);
  } catch (error) {
    console.error(`❌ Ошибка при копировании ${src}:`, error.message);
    process.exit(1);
  }
}

packages.forEach(({ src, dest }) => {
  copyPackage(src, dest);
});

console.log('🎉 Все package.json успешно скопированы!');
