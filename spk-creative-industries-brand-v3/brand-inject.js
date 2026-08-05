(()=>{
 const frame=document.getElementById('spk-site'); if(!frame)return;
 const base=new URL(window.SPK_ASSET_BASE||'./',location.href).href;
 const icon=(id,cls='brand-icon')=>`<svg class="${cls}" aria-hidden="true" focusable="false"><use href="${base}icons.svg#${id}"></use></svg>`;
 const setImage=(img,src,alt='',eager=false)=>{if(!img)return;img.src=base+src;img.alt=alt;img.decoding='async';img.loading=eager?'eager':'lazy';if(eager)img.fetchPriority='high'};
 const ensureMeta=d=>{
  d.documentElement.style.colorScheme='light';
  d.title='СПК культуры и креативных индустрий — итоговый демонстрационный сайт';
  const desc='Брендированный функциональный прототип сайта СПК культуры и креативных индустрий: профстандарты, квалификации, НОК, проекты, события и документы.';
  let m=d.querySelector('meta[name="description"]');if(!m){m=d.createElement('meta');m.name='description';d.head.append(m)}m.content=desc;
  let theme=d.querySelector('meta[name="theme-color"]');if(!theme){theme=d.createElement('meta');theme.name='theme-color';d.head.append(theme)}theme.content='#111936';
  let fav=d.querySelector('link[rel~="icon"]');if(!fav){fav=d.createElement('link');fav.rel='icon';d.head.append(fav)}fav.href=base+'logo-mark.svg';
 };
 const apply=()=>{
  let d; try{d=frame.contentDocument}catch(e){return} if(!d||!d.body)return;
  ensureMeta(d);
  if(!d.getElementById('brand-overlay-css')){const l=d.createElement('link');l.id='brand-overlay-css';l.rel='stylesheet';l.href=base+'brand-overlay.css';d.head.append(l)}
  d.body.classList.add('brand-visual-upgrade');
  const logo=d.querySelector('.brand > img'); setImage(logo,'logo-mark.svg','СПК ККИ',true);
  const footerLogo=d.querySelector('.footer-brand > img'); setImage(footerLogo,'logo-mark.svg','СПК ККИ');
  const hv=d.querySelector('.hero-slide:first-child .hero-slide__visual');
  if(hv&&!hv.querySelector('.brand-hero-image'))hv.innerHTML=`<img class="brand-hero-image" src="${base}hero-ecosystem.svg" alt="Экосистема культуры, креативных индустрий и квалификаций" loading="eager" decoding="async" fetchpriority="high">`;
  const metrics=['icon-standard','icon-centre','icon-certificate'];d.querySelectorAll('.metric-card').forEach((c,i)=>{if(metrics[i]&&!c.querySelector('.metric-card__brand-icon'))c.insertAdjacentHTML('afterbegin',`<span class="metric-card__brand-icon">${icon(metrics[i])}</span>`)});
  const quick=['icon-standard','icon-qualification','icon-calendar','icon-project','icon-document','icon-expert'];d.querySelectorAll('.quick-action').forEach((c,i)=>{const el=c.querySelector('i');if(el&&quick[i]&&!el.querySelector('svg'))el.innerHTML=icon(quick[i])});
  const directions=['icon-standard','icon-qualification','icon-education','icon-expert','icon-analytics'];d.querySelectorAll('.direction-card').forEach((c,i)=>{const el=c.querySelector('.direction-card__icon');if(el&&directions[i]&&!el.querySelector('svg'))el.innerHTML=icon(directions[i])});
  const industries=['icon-cinema','icon-design','icon-music','icon-heritage','icon-digital','icon-education'];d.querySelectorAll('.industry-card').forEach((c,i)=>{const el=c.querySelector('.industry-card__art');if(el&&industries[i]&&!el.querySelector('svg'))el.innerHTML=icon(industries[i])});
  const q=d.querySelector('.qualification-journey .qualification-flow'); if(q&&!d.querySelector('.brand-flow-image'))q.insertAdjacentHTML('afterend',`<img class="brand-flow-image" src="${base}qualification-flow.svg" loading="lazy" decoding="async" alt="Как работает система квалификаций: сигнал рынка, профстандарт, квалификация и НОК">`);
  const role=d.querySelector('.role-navigator'); if(role&&!d.querySelector('.brand-visual-section'))role.insertAdjacentHTML('afterend',`<section class="brand-visual-section" aria-labelledby="brand-routes-title"><div class="shell"><div class="brand-visual-section__head"><div><span class="section-kicker">Персональные сценарии</span><h2 id="brand-routes-title">Четыре маршрута — одна система</h2></div><p>Путь пользователя меняется в зависимости от роли, но все маршруты соединены стандартами, квалификациями и независимой оценкой.</p></div><img class="brand-infographic" src="${base}user-routes.svg" loading="lazy" decoding="async" alt="Маршруты соискателя, работодателя, образовательной организации и эксперта"></div></section>`);
  const daily=d.querySelector('.daily-standard-card');if(daily&&!daily.querySelector('.brand-standard-watermark'))daily.insertAdjacentHTML('beforeend',`<img class="brand-standard-watermark" src="${base}standards-visual.svg" loading="lazy" decoding="async" alt="">`);
  [['.page-hero--projects','projects-events.svg','Проекты и события креативных индустрий'],['.page-hero--events','projects-events.svg','Афиша и события креативных индустрий'],['.page-hero--standards','standards-visual.svg','Профессиональные стандарты и квалификации']].forEach(([sel,src,alt])=>{const h=d.querySelector(sel+' .page-hero__inner');if(h&&!h.querySelector('.brand-page-visual'))h.insertAdjacentHTML('beforeend',`<img class="brand-page-visual" src="${base+src}" loading="lazy" decoding="async" alt="${alt}">`)});
  const about=d.querySelector('[data-page="about"]')||d.querySelector('.page-about'); if(about&&!d.querySelector('.brand-system-showcase'))about.insertAdjacentHTML('beforeend',`<section class="brand-system-showcase"><div class="shell brand-system-showcase__grid"><img src="${base}logo-full.svg" loading="lazy" decoding="async" alt="Проектный фирменный знак СПК ККИ"><div><span class="section-kicker">Фирменная система</span><h2>Официальность, культура и развитие в одном визуальном языке</h2><p>Знак объединяет траектории профессионального роста, отраслевые связи и разнообразие креативных индустрий. До утверждения Советом используется как проектная версия.</p><div class="brand-system-showcase__swatches" aria-label="Фирменная палитра"><span title="Глубокий синий" style="background:#111936"></span><span title="Фиолетовый" style="background:#7657ff"></span><span title="Бирюзовый" style="background:#08c6c8"></span><span title="Коралловый" style="background:#ff5e70"></span><span title="Тёплый жёлтый" style="background:#ffc43d"></span></div></div></div></section>`);
  d.querySelectorAll('.brand-hero-image,.brand-flow-image,.brand-infographic,.brand-page-visual,.brand-system-showcase img').forEach(img=>{img.addEventListener('error',()=>img.classList.add('brand-image-error'),{once:true})});
 };
 let observer;
 const boot=()=>{apply();let d;try{d=frame.contentDocument}catch(e){return}if(!d||!d.body)return;observer?.disconnect();observer=new MutationObserver(()=>requestAnimationFrame(apply));observer.observe(d.body,{subtree:true,childList:true})};
 frame.addEventListener('load',boot);
 if(frame.contentDocument?.readyState==='interactive'||frame.contentDocument?.readyState==='complete')boot();
})();
