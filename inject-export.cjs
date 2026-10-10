const fs=require('fs');
const p='index.html';
let s=fs.readFileSync(p,'utf8');
if(!s.includes('src="/export.js"')) s=s.replace('</body>','<script src="/export.js"></script></body>');
fs.writeFileSync(p,s);
console.log('Export tools connected');
