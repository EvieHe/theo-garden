const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector('.story-hero');
const heroImage=hero?.querySelector('img');
const heroDate=hero?.querySelector('.story-date');
if(!reduce&&hero&&heroImage&&heroDate){
  const onScroll=()=>{const y=Math.min(innerHeight,scrollY);heroImage.style.setProperty('--hero-y',`${y*.13}px`);heroImage.style.setProperty('--hero-scale',String(1+y/innerHeight*.06));heroDate.style.setProperty('--date-y',`${y*.24}px`);hero.style.opacity=String(Math.max(.28,1-y/innerHeight*.68))};
  addEventListener('scroll',onScroll,{passive:true});onScroll();
}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.22,rootMargin:'0px 0px -5%'});
document.querySelectorAll('.story-block,.story-end').forEach(el=>observer.observe(el));
