// parseExpressionの動作をシミュレート
function splitByOperator(expr, operator) {
  const parts = [];
  let currentPart = '';
  let inString = false;
  let stringChar = '';
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      currentPart += char;
    } else if (inString && char === stringChar) {
      inString = false;
      currentPart += char;
    } else if (!inString && expr.substr(i, operator.length) === operator) {
      parts.push(currentPart);
      currentPart = '';
      i += operator.length - 1;
    } else {
      currentPart += char;
    }
    i++;
  }
  
  if (currentPart) {
    parts.push(currentPart);
  }
  
  return parts;
}

const expr = 'first_name + " " + last_name';
console.log('Expression:', expr);

const parts = splitByOperator(expr, '+');
console.log('Split by +:', parts);

// 右結合で処理
const leftParts = parts.slice(0, -1);
const rightPart = parts[parts.length - 1].trim();
const leftPart = leftParts.join('+').trim();

console.log('Left part:', leftPart);
console.log('Right part:', rightPart);

// 左の部分を再帰的に分割
if (leftPart.includes('+')) {
  const leftSubParts = splitByOperator(leftPart, '+');
  console.log('Left sub-parts:', leftSubParts);
  
  const leftSubLeftParts = leftSubParts.slice(0, -1);
  const leftSubRightPart = leftSubParts[leftSubParts.length - 1].trim();
  const leftSubLeftPart = leftSubLeftParts.join('+').trim();
  
  console.log('Left sub-left:', leftSubLeftPart);
  console.log('Left sub-right:', leftSubRightPart);
}