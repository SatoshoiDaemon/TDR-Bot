const fs = require('fs');
const path = require('path');

const schedulerPath = path.join('src', 'scheduler', 'eventScheduler.ts');
const enigmasPath = 'enigmas.md';

let schedulerContent = fs.readFileSync(schedulerPath, 'utf8');
const enigmasContent = fs.readFileSync(enigmasPath, 'utf8');

const newEnigmas = enigmasContent
  .split('\n')
  .filter(l => l.includes('{ q: '))
  .map(l => '    ' + l.trim() + (l.trim().endsWith(',') ? '' : ','));

const searchStr = "    { q: 'Stan Lee é mundialmente famoso por ser o rosto e maior autor de qual editora de quadrinhos?', a: ['marvel', 'marvel comics'] }";
const injectIndex = schedulerContent.indexOf(searchStr);

if (injectIndex > -1) {
  const lineEnd = schedulerContent.indexOf('}', injectIndex) + 1;
  const before = schedulerContent.substring(0, lineEnd);
  const after = schedulerContent.substring(lineEnd);
  
  schedulerContent = before + ',\n' + newEnigmas.join('\n').replace(/,\s*$/, '') + '\n' + after;
  fs.writeFileSync(schedulerPath, schedulerContent);
  console.log('Enigmas adicionados com sucesso! Total adicionado:', newEnigmas.length);
} else {
  console.log('Não foi possível encontrar a linha de injeção.');
}
