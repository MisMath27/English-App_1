const fs = require('fs');
const path = require('path');
const axios = require('axios');

const jsonPath = path.join(__dirname, '../src/data/words.json');
const outputPath = path.join(__dirname, '../src/data/words_with_translation.json');

// Читаем слова
const words = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Всего слов: ${words.length}`);

async function translateWord(word) {
  try {
    const response = await axios.get(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|ru`,
      { timeout: 5000 }
    );
    return response.data.responseData?.translatedText || '';
  } catch (error) {
    return '';
  }
}

async function translateBatch(batch) {
  const promises = batch.map(async (item) => {
    // Пропускаем уже переведённые
    if (item.translation && item.translation.length > 0) {
      return item;
    }
    const translation = await translateWord(item.word);
    return {
      ...item,
      translation: translation || 'Перевод отсутствует'
    };
  });
  return await Promise.all(promises);
}

async function translateAll() {
  console.log('Начинаем перевод...');

  const batchSize = 10;
  const delay = 100;

  const translatedWords = [];
  let completed = 0;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const results = await translateBatch(batch);
    translatedWords.push(...results);

    completed += batch.length;
    if (completed % 100 === 0 || completed === words.length) {
      console.log(`Переведено ${completed} / ${words.length} слов...`);
      fs.writeFileSync(outputPath, JSON.stringify(translatedWords, null, 2));
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }

  fs.writeFileSync(outputPath, JSON.stringify(translatedWords, null, 2));
  console.log(`Готово! Переведено ${translatedWords.length} слов!`);
  console.log(`Файл: ${outputPath}`);
}

translateAll().catch(console.error);