// visitor.tsのvisitAssignメソッドの動作をデバッグするためのスクリプト
const fs = require('fs');

// visitor.tsファイルを読み込んで、visitAssignメソッドにデバッグログを追加
const visitorPath = './src/parser/visitor.ts';
let visitorContent = fs.readFileSync(visitorPath, 'utf8');

// visitAssignメソッドの開始部分にログを追加
const visitAssignStart = 'visitAssign(node: ASTNode): IR {';
const visitAssignStartWithLog = `visitAssign(node: ASTNode): IR {
    console.log('visitAssign called with node:', JSON.stringify(node, null, 2));`;

// node.value.typeの判定部分にログを追加
const nodeValueTypeCheck = '// visitAssign: node.value.type';
const nodeValueTypeCheckWithLog = `// visitAssign: node.value.type
    console.log('node.value.type:', node.value.type);`;

if (visitorContent.includes(visitAssignStart) && !visitorContent.includes('console.log(\'visitAssign called with node:')) {
  visitorContent = visitorContent.replace(visitAssignStart, visitAssignStartWithLog);
  visitorContent = visitorContent.replace(nodeValueTypeCheck, nodeValueTypeCheckWithLog);
  
  fs.writeFileSync(visitorPath, visitorContent);
  console.log('Debug logs added to visitor.ts');
} else {
  console.log('Debug logs already exist or visitAssign method not found');
}