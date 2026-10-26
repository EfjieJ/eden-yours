// Gabarits anglais : remplace le texte statique des éléments data-i18n par la valeur anglaise de js/i18n.js
// (sans JS, ou pour les aperçus de partage, la page anglaise est alors en anglais).
import fs from 'fs';
const src=fs.readFileSync('js/i18n.js','utf8');const a=src.indexOf('var dict = ');const b=src.indexOf('\n  };\n',a);
const dict=eval('('+src.slice(a+11,b+4)+')');const en=dict.en;const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
for(const f of process.argv.slice(2)){let t=fs.readFileSync(f,'utf8');let n=0;
 t=t.replace(/(<[a-z0-9]+\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/)/g,(m,o,k,txt,c)=>{if(en[k]==null||/<[a-z]/i.test(en[k]))return m;n++;return o+en[k].replace(/&/g,'&amp;').replace(/</g,'&lt;')+c});
 t=t.replace(/(<[^>]*\sdata-i18n-([a-z-]+)="([^"]+)"[^>]*>)/g,(m,tag,attr,k)=>{if(en[k]==null)return m;const an=attr==='aria'?'aria-label':attr;const re=new RegExp('(\\s'+an+'=")[^"]*(")');if(!re.test(tag))return m;n++;return tag.replace(re,(x,p,q)=>p+esc(en[k])+q)});
 fs.writeFileSync(f,t);console.log(f,n);}
