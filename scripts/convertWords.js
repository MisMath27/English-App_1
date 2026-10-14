const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, '../src/data/words.txt');
const jsonPath = path.join(__dirname, '../src/data/words.json');

const text = fs.readFileSync(txtPath, 'utf8');
const lines = text.split('\n').filter(line => line.trim());

const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];

const words = lines.map((word, index) => {
  let level = 'C1';
  if (index < 1000) level = 'A1';
  else if (index < 2000) level = 'A2';
  else if (index < 4000) level = 'B1';
  else if (index < 7000) level = 'B2';
  else level = 'C1';

  return {
    id: index + 1,
    word: word.trim(),
    translation: '',
    level: level,
    partOfSpeech: '',
    example: '',
    transcription: '',
    reviewCount: 0,
    isLearned: false,
    lastReviewed: null
  };
});

fs.writeFileSync(jsonPath, JSON.stringify(words, null, 2));
console.log('Создано ' + words.length + ' слов в ' + jsonPath);
