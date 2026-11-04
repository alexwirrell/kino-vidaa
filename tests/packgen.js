// Genera un script empaquetado estilo Dean Edwards (p,a,c,k,e,d) para la prueba
function pack(code) {
  const words = [...new Set(code.match(/\b\w+\b/g))];
  const a = 36, enc = n => (n < a ? "" : enc(Math.floor(n / a))) + ((n = n % a) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
  const idx = new Map(words.map((w, i) => [w, i]));
  const p = code.replace(/\b\w+\b/g, w => enc(idx.get(w))).replace(/'/g, "\\'");
  return `eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}return p}('${p}',${a},${words.length},'${words.join("|")}'.split('|'),0,{}))`;
}
module.exports = pack;
