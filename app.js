const DEFAULT_SUBJECTS=["Mathe","Deutsch","Englisch","Biologie","Chemie","Physik","Geschichte","Geographie","Informatik","Politik","Wirtschaft","Religion","Philosophie","Sport","Kunst","Musik","Spanisch","Französisch","Latein","Sonstiges"];
const DAYS=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag"];
const KEY="schulplaner.pwa.data.v1";
let data=loadData(), selectedDay=1, editorState=null;

function loadData(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved) return {subjects:saved.subjects||[],books:saved.books||[],tasks:saved.tasks||[],lessons:saved.lessons||[]};
  }catch(e){}
  return {subjects:[],books:[],tasks:[],lessons:[]};
}
function saveData(){localStorage.setItem(KEY,JSON.stringify(data));renderAll();}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function subjectInfo(name){return data.subjects.find(s=>s.name===name)||{}}
function fmtDate(v){if(!v)return""; const [y,m,d]=v.split("-"); return `${d}.${m}.${y}`;}
function dueDateTime(t){
  if(!t.dueDate)return null;
  const time=t.dueTime||"23:59";
  const d=new Date(`${t.dueDate}T${time}:00`);
  return Number.isNaN(d.getTime())?null:d;
}
function pages(t){return t.pageFrom&&t.pageTo?`${t.pageFrom}–${t.pageTo}`:(t.pageFrom||"")}
function bookById(id){return data.books.find(b=>b.id===id)}
function taskMeta(t){
  const b=bookById(t.bookId), teacher=subjectInfo(t.subject).teacher||"";
  return [teacher&&`👨‍🏫 ${teacher}`,b&&`📚 ${b.title}`,t.topic&&`Thema: ${t.topic}`,pages(t)&&`S. ${pages(t)}`].filter(Boolean).join(" · ");
}
function toast(msg){const el=document.querySelector("#toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}

function setView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".tab,.bottom-tab").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".tab,.bottom-tab").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-action]"); if(!a)return;
  ({ "new-task":()=>openTask(), "new-book":()=>openBook(), "new-subject":()=>openSubject(), "new-lesson":()=>openLesson() }[a.dataset.action]||(()=>{}))();
});

function updateClock(){
  document.querySelector("#clock").textContent=new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(new Date())+" Uhr";
}
setInterval(updateClock,1000);updateClock();

function renderStats(){
  const now=new Date(), end24=new Date(now.getTime()+86400000), today=localYMD(now), end7=localYMD(new Date(now.getTime()+7*86400000));
  const open=data.tasks.filter(t=>!t.completed);
  const cards=[
    ["📝","Offene Aufgaben",open.length],
    ["📅","Heute fällig",open.filter(t=>t.dueDate===today).length],
    ["🔔","Nächste 24 Stunden",open.filter(t=>{const d=dueDateTime(t);return d&&d>now&&d<=end24}).length],
    ["⚠️","Überfällig",open.filter(t=>{const d=dueDateTime(t);return d&&d<now}).length],
    ["📆","Nächste 7 Tage",open.filter(t=>t.dueDate&&t.dueDate>=today&&t.dueDate<=end7).length]
  ];
  document.querySelector("#stats").innerHTML=cards.map(c=>`<article class="stat"><div class="icon">${c[0]}</div><strong>${c[2]}</strong><span>${c[1]}</span></article>`).join("");
}
function localYMD(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}

function taskCard(t){
  const d=dueDateTime(t), now=new Date(), overdue=!t.completed&&d&&d<now;
  const due=t.dueDate?`${fmtDate(t.dueDate)}${t.dueTime?" · "+t.dueTime:""}`:"Ohne Termin";
  return `<article class="item-card clickable" data-task="${t.id}">
    <div><h4>${t.completed?"✓ ":""}${esc(t.subject)} · ${esc(t.description)}</h4>
    <p>${esc(taskMeta(t)||"")}</p>
    <div class="badges">
      <span class="badge ${t.completed?"done":overdue?"overdue":""}">${t.completed?"ERLEDIGT":overdue?"ÜBERFÄLLIG":"OFFEN"}</span>
      <span class="badge ${(t.priority||"Normal").toLowerCase()}">${esc(t.priority||"Normal")}</span>
      <span class="badge">${esc(due)}</span>
    </div></div>
    <button class="ghost toggle-task" data-id="${t.id}">${t.completed?"↩ Öffnen":"✓ Erledigt"}</button>
  </article>`;
}
function sortedTasks(list){
 return [...list].sort((a,b)=>{
   if(a.completed!==b.completed)return a.completed?1:-1;
   const ad=dueDateTime(a)?.getTime()??Infinity,bd=dueDateTime(b)?.getTime()??Infinity;
   if(ad!==bd)return ad-bd;
   return ({Hoch:1,Normal:2,Niedrig:3}[a.priority]||4)-({Hoch:1,Normal:2,Niedrig:3}[b.priority]||4);
 });
}
function renderTasks(){
  const filter=document.querySelector("#taskFilter").value;
  let list=data.tasks.filter(t=>filter==="Alle"||filter==="Offen"&&!t.completed||filter==="Erledigt"&&t.completed);
  const root=document.querySelector("#taskList");
  root.innerHTML=list.length?sortedTasks(list).map(taskCard).join(""):`<div class="empty">Keine Aufgaben in dieser Ansicht.</div>`;
  root.querySelectorAll("[data-task]").forEach(el=>el.addEventListener("click",e=>{if(!e.target.closest(".toggle-task"))openTask(el.dataset.task)}));
  root.querySelectorAll(".toggle-task").forEach(b=>b.addEventListener("click",()=>{const t=data.tasks.find(x=>x.id===b.dataset.id);t.completed=!t.completed;saveData();toast(t.completed?"Aufgabe erledigt":"Aufgabe wieder geöffnet")}));
}
document.querySelector("#taskFilter").addEventListener("change",renderTasks);

function renderDashboard(){
  renderStats();
  const now=new Date(),end24=new Date(now.getTime()+86400000);
  const rem=sortedTasks(data.tasks.filter(t=>!t.completed&&dueDateTime(t)>now&&dueDateTime(t)<=end24));
  const next=sortedTasks(data.tasks.filter(t=>!t.completed)).slice(0,8);
  const r=document.querySelector("#reminders"),n=document.querySelector("#nextTasks");
  r.innerHTML=rem.length?rem.map(taskCard).join(""):`<div class="empty">Keine Aufgabe in den nächsten 24 Stunden.</div>`;
  n.innerHTML=next.length?next.map(taskCard).join(""):`<div class="empty">Noch keine offenen Aufgaben.</div>`;
  [r,n].forEach(root=>{
    root.querySelectorAll("[data-task]").forEach(el=>el.addEventListener("click",e=>{if(!e.target.closest(".toggle-task"))openTask(el.dataset.task)}));
    root.querySelectorAll(".toggle-task").forEach(b=>b.addEventListener("click",()=>{const t=data.tasks.find(x=>x.id===b.dataset.id);t.completed=!t.completed;saveData()}));
  });
}

function renderBooks(){
 const root=document.querySelector("#bookList");
 root.innerHTML=data.books.length?[...data.books].sort((a,b)=>(a.subject+a.title).localeCompare(b.subject+b.title,"de")).map(b=>`<article class="item-card clickable" data-book="${b.id}"><div><h4>📚 ${esc(b.title)}</h4><p>${esc(b.subject)}${b.author?" · "+esc(b.author):""}</p></div><span>›</span></article>`).join(""):`<div class="empty">Noch keine Bücher angelegt.</div>`;
 root.querySelectorAll("[data-book]").forEach(el=>el.addEventListener("click",()=>openBook(el.dataset.book)));
}
function renderSubjects(){
 const root=document.querySelector("#subjectList");
 root.innerHTML=data.subjects.length?[...data.subjects].sort((a,b)=>a.name.localeCompare(b.name,"de")).map(s=>`<article class="item-card clickable" data-subject="${s.id}"><div><h4>${esc(s.name)}</h4><p>${[s.teacher&&"👨‍🏫 "+s.teacher,s.email&&"✉️ "+s.email,s.room&&"🚪 Raum "+s.room].filter(Boolean).map(esc).join(" · ")}</p></div><span>›</span></article>`).join(""):`<div class="empty">Noch keine eigenen Fächer angelegt. Standardfächer stehen trotzdem zur Auswahl.</div>`;
 root.querySelectorAll("[data-subject]").forEach(el=>el.addEventListener("click",()=>openSubject(el.dataset.subject)));
}

function renderCalendar(){
 const switcher=document.querySelector("#weekdaySwitch");
 switcher.innerHTML=DAYS.map((d,i)=>`<button class="${selectedDay===i+1?"active":""}" data-day="${i+1}">${d}</button>`).join("");
 switcher.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
   selectedDay=+b.dataset.day;renderCalendar();
 }));
 const root=document.querySelector("#calendarGrid");
 root.innerHTML=DAYS.map((day,di)=>`<section class="day-column ${selectedDay===di+1?"active":""}"><h3>${day}</h3>${
   Array.from({length:12},(_,i)=>{
     const nr=i+1, ls=data.lessons.filter(l=>l.weekday===di+1&&l.lessonNumber===nr);
     const content=ls.map(l=>`<div class="lesson" data-lesson="${l.id}">
       <div class="lesson-title">📚 ${esc(l.subject)}</div>
       <div class="lesson-meta">${l.duration===2?"Doppelstunde":"Einzelstunde"}${l.teacher?" · 👨‍🏫 "+esc(l.teacher):""}${l.room?" · 🚪 "+esc(l.room):""}</div>
       ${l.note?`<div class="lesson-note">${esc(l.note)}</div>`:""}
     </div>`).join("");
     return `<div class="lesson-slot ${ls.length?"":"empty-slot"}" data-slot-day="${di+1}" data-slot-number="${nr}">
       <div class="lesson-number">${nr}. Stunde</div>${content}
     </div>`;
   }).join("")
 }</section>`).join("");

 root.querySelectorAll("[data-lesson]").forEach(el=>el.addEventListener("click",e=>{
   e.stopPropagation();openLesson(el.dataset.lesson);
 }));
 root.querySelectorAll(".empty-slot").forEach(el=>el.addEventListener("click",()=>{
   selectedDay=+el.dataset.slotDay;
   openLesson(null,+el.dataset.slotDay,+el.dataset.slotNumber);
 }));
}

const field=(name,label,type="text",value="",opts={})=>{
 const full=opts.full?" full":"", required=opts.required?" required":"";
 if(type==="select") return `<div class="field${full}"><label for="${name}">${label}</label><select id="${name}" name="${name}"${required}>${opts.options.map(o=>`<option value="${esc(o.value??o)}"${String(o.value??o)===String(value)?" selected":""}>${esc(o.label??o)}</option>`).join("")}</select></div>`;
 if(type==="textarea") return `<div class="field${full}"><label for="${name}">${label}</label><textarea id="${name}" name="${name}"${required}>${esc(value)}</textarea></div>`;
 return `<div class="field${full}"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}"${required}${opts.min?` min="${opts.min}"`:""}${opts.max?` max="${opts.max}"`:""}></div>`;
};
function showEditor(title,html,state){
 editorState=state;
 document.querySelector("#editorTitle").textContent=title;
 document.querySelector("#editorFields").innerHTML=html;
 document.querySelector("#deleteBtn").classList.toggle("hidden",!state.id);
 document.querySelector("#editor").showModal();
}
function subjectOptions(current=""){
 return [...new Set([...DEFAULT_SUBJECTS,...data.subjects.map(s=>s.name),current].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"de"));
}
function openTask(id=null){
 const t=data.tasks.find(x=>x.id===id)||{subject:"Mathe",description:"",bookId:"",topic:"",pageFrom:"",pageTo:"",dueDate:"",dueTime:"18:00",priority:"Normal",completed:false,duration:1};
 const books=[{value:"",label:"Kein Buch"},...data.books.filter(b=>!t.subject||b.subject===t.subject).map(b=>({value:b.id,label:`${b.title}${b.author?" · "+b.author:""}`}))];
 showEditor(id?"Aufgabe bearbeiten":"Neue Aufgabe",
  field("subject","Fach *","select",t.subject,{options:subjectOptions(t.subject),required:true})+
  field("description","Aufgabe *","text",t.description,{required:true,full:true})+
  field("bookId","Buch","select",t.bookId||"",{options:books})+
  field("topic","Thema","text",t.topic||"")+
  field("pageFrom","Seite von","number",t.pageFrom||"",{min:"1"})+
  field("pageTo","Seite bis","number",t.pageTo||"",{min:"1"})+
  field("dueDate","Fällig am","date",t.dueDate||"")+
  field("dueTime","Uhrzeit","time",t.dueTime||"18:00")+
  field("priority","Priorität","select",t.priority||"Normal",{options:["Hoch","Normal","Niedrig"]})+
  field("duration","Dauer (Std.)","number",t.duration||1,{min:"1",max:"24"}),
 {type:"task",id});
}
function openBook(id=null){
 const b=data.books.find(x=>x.id===id)||{subject:"Mathe",title:"",author:""};
 showEditor(id?"Buch bearbeiten":"Neues Buch",
  field("subject","Fach *","select",b.subject,{options:subjectOptions(b.subject),required:true})+
  field("title","Titel *","text",b.title,{required:true,full:true})+
  field("author","Autor","text",b.author,{full:true}),{type:"book",id});
}
function openSubject(id=null){
 const s=data.subjects.find(x=>x.id===id)||{name:"",teacher:"",email:"",room:""};
 showEditor(id?"Fach bearbeiten":"Neues Fach",
  field("name","Fach *","text",s.name,{required:true,full:true})+
  field("teacher","Lehrer","text",s.teacher)+
  field("room","Raum","text",s.room)+
  field("email","E-Mail","email",s.email,{full:true}),{type:"subject",id});
}
function openLesson(id=null,day=null,lessonNumber=null){
 const l=data.lessons.find(x=>x.id===id)||{weekday:day||selectedDay,lessonNumber:lessonNumber||1,duration:1,subject:"Mathe",teacher:"",room:"",note:""};
 showEditor(id?"Stunde bearbeiten":"Neue Stunde",
  field("weekday","Wochentag","select",l.weekday,{options:DAYS.map((d,i)=>({value:i+1,label:d}))})+
  field("lessonNumber","Stunde","select",l.lessonNumber,{options:Array.from({length:12},(_,i)=>String(i+1))})+
  field("duration","Dauer","select",l.duration,{options:[{value:1,label:"1 – Einzelstunde"},{value:2,label:"2 – Doppelstunde"}]})+
  field("subject","Fach *","select",l.subject,{options:subjectOptions(l.subject),required:true})+
  field("teacher","Lehrer","text",l.teacher||"")+
  field("room","Raum","text",l.room||"")+
  field("note","Notiz","textarea",l.note||"",{full:true}),{type:"lesson",id});
}

document.querySelector("#editorForm").addEventListener("submit",e=>{
 e.preventDefault(); if(!editorState)return;
 const f=Object.fromEntries(new FormData(e.currentTarget).entries());
 if(editorState.type==="task"){
   if(!f.subject.trim()||!f.description.trim())return toast("Fach und Aufgabe sind Pflichtfelder.");
   const old=data.tasks.find(x=>x.id===editorState.id);
   const obj={id:editorState.id||uid(),subject:f.subject.trim(),description:f.description.trim(),bookId:f.bookId||"",topic:f.topic.trim(),pageFrom:f.pageFrom,pageTo:f.pageTo,dueDate:f.dueDate,dueTime:f.dueTime,priority:f.priority,duration:+f.duration||1,completed:old?.completed||false};
   upsert("tasks",obj);
 }else if(editorState.type==="book"){
   if(!f.subject.trim()||!f.title.trim())return toast("Fach und Titel sind Pflichtfelder.");
   upsert("books",{id:editorState.id||uid(),subject:f.subject.trim(),title:f.title.trim(),author:f.author.trim()});
 }else if(editorState.type==="subject"){
   if(!f.name.trim())return toast("Bitte einen Fachnamen eingeben.");
   const duplicate=data.subjects.some(x=>x.name.toLowerCase()===f.name.trim().toLowerCase()&&x.id!==editorState.id);
   if(duplicate)return toast("Dieses Fach gibt es bereits.");
   const old=data.subjects.find(x=>x.id===editorState.id);
   if(old&&old.name!==f.name.trim()){data.tasks.filter(t=>t.subject===old.name).forEach(t=>t.subject=f.name.trim());data.books.filter(b=>b.subject===old.name).forEach(b=>b.subject=f.name.trim());data.lessons.filter(l=>l.subject===old.name).forEach(l=>l.subject=f.name.trim())}
   upsert("subjects",{id:editorState.id||uid(),name:f.name.trim(),teacher:f.teacher.trim(),email:f.email.trim(),room:f.room.trim()});
 }else if(editorState.type==="lesson"){
   if(+f.duration===2&&+f.lessonNumber>=12)return toast("Eine Doppelstunde kann nicht in der 12. Stunde beginnen.");
   upsert("lessons",{id:editorState.id||uid(),weekday:+f.weekday,lessonNumber:+f.lessonNumber,duration:+f.duration,subject:f.subject.trim(),teacher:f.teacher.trim(),room:f.room.trim(),note:f.note.trim()});
 }
 document.querySelector("#editor").close();saveData();toast("Gespeichert");
});
function upsert(type,obj){const i=data[type].findIndex(x=>x.id===obj.id);if(i>=0)data[type][i]=obj;else data[type].push(obj)}
document.querySelector("#deleteBtn").addEventListener("click",()=>{
 if(!editorState?.id)return;
 const type=editorState.type;
 if(type==="book"&&data.tasks.some(t=>t.bookId===editorState.id))return toast("Dieses Buch wird noch von einer Aufgabe verwendet.");
 if(type==="subject"){
   const s=data.subjects.find(x=>x.id===editorState.id);
   if(s&&(data.tasks.some(t=>t.subject===s.name)||data.books.some(b=>b.subject===s.name)||data.lessons.some(l=>l.subject===s.name)))return toast("Dieses Fach wird noch verwendet.");
 }
 if(!confirm("Diesen Eintrag wirklich löschen?"))return;
 const map={task:"tasks",book:"books",subject:"subjects",lesson:"lessons"};
 data[map[type]]=data[map[type]].filter(x=>x.id!==editorState.id);
 document.querySelector("#editor").close();saveData();toast("Gelöscht");
});

function exportBackup(){
  const backup={app:"Mein Schulplaner",version:2,exportedAt:new Date().toISOString(),data};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`schulplaner-backup-${localYMD(new Date())}.json`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Backup erstellt");
}
async function importBackup(file){
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text()),incoming=parsed.data||parsed;
    if(!incoming||!["subjects","books","tasks","lessons"].every(k=>Array.isArray(incoming[k])))throw new Error("format");
    if(!confirm("Das Backup ersetzt die aktuell auf diesem Gerät gespeicherten Schulplaner-Daten. Fortfahren?"))return;
    data={subjects:incoming.subjects,books:incoming.books,tasks:incoming.tasks,lessons:incoming.lessons};
    saveData();toast("Backup wiederhergestellt");
  }catch(e){alert("Die Datei konnte nicht als Schulplaner-Backup gelesen werden.");}
  finally{document.querySelector("#importBackup").value="";}
}
document.querySelector("#exportBackup").addEventListener("click",exportBackup);
document.querySelector("#importBackup").addEventListener("change",e=>importBackup(e.target.files[0]));


// iOS/PWA: Dialog zuverlässig schließen
const editorDialog=document.querySelector("#editor");
function closeEditor(){
  if(editorDialog && editorDialog.open) editorDialog.close();
}
document.querySelector("#closeEditorBtn")?.addEventListener("click",closeEditor);
document.querySelector("#cancelEditorBtn")?.addEventListener("click",closeEditor);

// Tippen auf den dunklen Bereich außerhalb des Dialoginhalts schließt ebenfalls.
editorDialog?.addEventListener("click",e=>{
  if(e.target!==editorDialog)return;
  const r=editorDialog.getBoundingClientRect();
  const inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  if(!inside) closeEditor();
});

// Escape/Abbruch-Ereignis sauber behandeln, ohne Formulardaten zu speichern.
editorDialog?.addEventListener("cancel",e=>{
  e.preventDefault();
  closeEditor();
});

function renderAll(){renderDashboard();renderTasks();renderBooks();renderSubjects();renderCalendar();}
renderAll();

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.warn));
