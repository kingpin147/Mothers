const fs = require('fs');
let c = fs.readFileSync('src/app/membership/ApplyModal.tsx', 'utf-8');

// 1. Remove question from stepsMeta
c = c.replace(/\{\s*titleEn:\s*"What are your children's ages\?",[\s\S]*?\},/, '');

// 2. Update Math.min logic
c = c.replace('Math.min(10, parsed._step)', 'Math.min(9, parsed._step)');

// 3. Update totalSteps
c = c.replace('const totalSteps = 11;', 'const totalSteps = 10;');

// 4. Update handleNext step checks
c = c.replace('if (step === 5) {', 'if (step === 4) {');
c = c.replace('if (step === 6) {', 'if (step === 5) {');

// 5. Update asterisks array
c = c.replace('[0, 1, 2, 4, 5, 6, 10]', '[0, 1, 2, 3, 4, 5, 9]');

// 6. Remove Step 3 block
c = c.replace(/\{\/\*\s*Step 3: Children's Ages[\s\S]*?\{\/\*\s*Step 4:/, '{/* Step 4:');

// 7. Decrement all subsequent steps
for (let i = 4; i <= 10; i++) {
  // Replace step label comments
  let commentRegex = new RegExp(`\\{\\/\\* Step ${i}:`, 'g');
  c = c.replace(commentRegex, `{/* Step ${i - 1}:`);
  
  // Replace step checks
  let stepCheckRegex = new RegExp(`\\{step === ${i} &&`, 'g');
  c = c.replace(stepCheckRegex, `{step === ${i - 1} &&`);
}

fs.writeFileSync('src/app/membership/ApplyModal.tsx', c);
