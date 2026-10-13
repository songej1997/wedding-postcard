// 사용: node tools/set-site-url.mjs https://songej1997.github.io/저장소이름/   (끝에 / 포함)
import fs from 'node:fs'; const u=process.argv[2];
if(!/^https:\/\/.+\/$/.test(u||'')){console.error('https:// 로 시작하고 / 로 끝나는 주소를 넣어 주세요');process.exit(1)}
const f=new URL('../index.html',import.meta.url); let s=fs.readFileSync(f,'utf8');
s=s.replace(/(property="og:url" content=")[^"]*"/,`$1${u}"`).replace(/(og:image" content=")[^"]*"/,`$1${u}assets/og-image.jpg"`).replace(/(twitter:image" content=")[^"]*"/,`$1${u}assets/og-image.jpg"`);
fs.writeFileSync(f,s); console.log('설정 완료:',u);
