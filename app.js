const DEFAULT_SUBJECTS=["Mathe","Deutsch","Englisch","Biologie","Chemie","Physik","Geschichte","Geographie","Informatik","Politik","Wirtschaft","Religion","Philosophie","Sport","Kunst","Musik","Spanisch","Französisch","Latein","Sonstiges"];
const DAYS=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag"];
const KEY="schulplaner.pwa.data.v1";
let data=loadData(), selectedDay=1, editorState=null;
function ensureFamilyData(){if(!Array.isArray(data.familyEvents))data.familyEvents=[];}
function ensureCycleData(){if(!Array.isArray(data.cycleEntries))data.cycleEntries=[];}
ensureCycleData();
ensureFamilyData();

function loadData(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved) return {subjects:saved.subjects||[],books:saved.books||[],tasks:saved.tasks||[],lessons:saved.lessons||[]};
  }catch(e){}
  return {subjects:[],books:[],tasks:[],lessons:[]};
}
let cloudClient=null, cloudUser=null, realtimeChannel=null, cloudWriteTimer=null, applyingRemote=false;

function setSyncStatus(text,state=""){
  const el=document.querySelector("#syncStatus");
  if(!el)return;
  el.textContent=text;
  el.className="sync-status"+(state?` ${state}`:"");
}
function saveData(){
  localStorage.setItem(KEY,JSON.stringify(data));
  renderAll();
  if(cloudUser && !applyingRemote) scheduleCloudSave();
}
function scheduleCloudSave(){
  clearTimeout(cloudWriteTimer);
  setSyncStatus("☁️ Synchronisiere…","busy");
  cloudWriteTimer=setTimeout(pushCloudState,350);
}
async function pushCloudState(){
  if(!cloudClient||!cloudUser)return;
  const payload={user_id:cloudUser.id,data,updated_at:new Date().toISOString()};
  const {error}=await cloudClient.from("planner_state").upsert(payload,{onConflict:"user_id"});
  if(error){console.error(error);setSyncStatus("⚠️ Sync-Fehler","error");return;}
  setSyncStatus("☁️ Synchronisiert","ok");
}
async function loadCloudState(){
  if(!cloudClient||!cloudUser)return;
  setSyncStatus("☁️ Lade Daten…","busy");
  const {data:row,error}=await cloudClient.from("planner_state").select("data,updated_at").eq("user_id",cloudUser.id).maybeSingle();
  if(error){console.error(error);setSyncStatus("⚠️ Cloud-Fehler","error");return;}
  if(row?.data){
    applyingRemote=true;
    data={subjects:row.data.subjects||[],books:row.data.books||[],tasks:row.data.tasks||[],lessons:row.data.lessons||[],familyEvents:row.data.familyEvents||[],cycleEntries:row.data.cycleEntries||[]};
    localStorage.setItem(KEY,JSON.stringify(data));renderAll();
    applyingRemote=false;
  }else{
    await pushCloudState();
  }
  setSyncStatus("☁️ Synchronisiert","ok");
}
function startRealtime(){
  if(!cloudClient||!cloudUser)return;
  if(realtimeChannel)cloudClient.removeChannel(realtimeChannel);
  realtimeChannel=cloudClient.channel(`planner-${cloudUser.id}`)
    .on("postgres_changes",{event:"*",schema:"public",table:"planner_state",filter:`user_id=eq.${cloudUser.id}`},payload=>{
      const remote=payload.new?.data;
      if(!remote)return;
      applyingRemote=true;
      data={subjects:remote.subjects||[],books:remote.books||[],tasks:remote.tasks||[],lessons:remote.lessons||[],familyEvents:remote.familyEvents||[],cycleEntries:remote.cycleEntries||[]};
      localStorage.setItem(KEY,JSON.stringify(data));renderAll();
      applyingRemote=false;
      setSyncStatus("☁️ Aktualisiert","ok");
    }).subscribe(status=>{
      if(status==="SUBSCRIBED")setSyncStatus("☁️ Live verbunden","ok");
    });
}

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

function openEditor(title,fieldsHtml,onSave,onDelete=null){
  const editor=document.querySelector("#editor");
  const form=document.querySelector("#editorForm");
  const fields=document.querySelector("#editorFields");
  const titleEl=document.querySelector("#editorTitle");
  const deleteBtn=document.querySelector("#deleteBtn");
  if(!editor||!form||!fields||!titleEl)return;

  titleEl.textContent=title;
  fields.innerHTML=fieldsHtml;
  if(deleteBtn){
    deleteBtn.classList.toggle("hidden",!onDelete);
    deleteBtn.onclick=onDelete?()=>onDelete():null;
  }

  form.onsubmit=e=>{
    e.preventDefault();
    onSave?.(form);
    if(editor.open)editor.close();
  };

  editor.showModal();
}

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
    data={subjects:incoming.subjects,books:incoming.books,tasks:incoming.tasks,lessons:incoming.lessons,familyEvents:incoming.familyEvents||[],cycleEntries:incoming.cycleEntries||[]};
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


function supabaseConfigured(){
  return window.SUPABASE_URL &&
    !window.SUPABASE_URL.includes("HIER_") &&
    window.SUPABASE_PUBLISHABLE_KEY &&
    !window.SUPABASE_PUBLISHABLE_KEY.includes("HIER_") &&
    window.FAMILY_LOGIN_EMAIL &&
    !window.FAMILY_LOGIN_EMAIL.includes("HIER_");
}
function showAuthMessage(msg,ok=false){
  const el=document.querySelector("#authMessage");if(!el)return;
  el.textContent=msg;el.style.color=ok?"#15803D":"#B91C1C";
}
function showLoggedIn(user){
  document.activeElement?.blur();
  document.querySelector("#authScreen")?.classList.add("hidden");
  document.querySelector("#accountBar")?.classList.remove("hidden");
  requestAnimationFrame(()=>{
    window.scrollTo(0,0);
    document.documentElement.scrollLeft=0;
    document.body.scrollLeft=0;
    handleViewportChange?.();
  });
}
function showLoggedOut(){
  document.querySelector("#authScreen")?.classList.remove("hidden");
  document.querySelector("#accountBar")?.classList.add("hidden");
  setSyncStatus("☁️ Nicht angemeldet");
}
async function initCloud(){
  if(!supabaseConfigured()){
    showLoggedOut();
    showAuthMessage("Supabase ist noch nicht vollständig eingerichtet. Bitte Konfiguration prüfen.");
    setSyncStatus("⚙️ Einrichtung nötig","busy");
    return;
  }
  cloudClient=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
  const {data:{session}}=await cloudClient.auth.getSession();
  if(session?.user){
    cloudUser=session.user;showLoggedIn(cloudUser);await loadCloudState();startRealtime();
  }else showLoggedOut();

  cloudClient.auth.onAuthStateChange(async(event,session)=>{
    cloudUser=session?.user||null;
    if(cloudUser){
      showLoggedIn(cloudUser);
      await loadCloudState();startRealtime();
    }else{
      if(realtimeChannel){cloudClient.removeChannel(realtimeChannel);realtimeChannel=null;}
      showLoggedOut();
    }
  });
}
document.querySelector("#loginForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!cloudClient)return showAuthMessage("Supabase ist noch nicht eingerichtet.");
  document.activeElement?.blur();
  showAuthMessage("Anmeldung läuft…",true);
  const password=document.querySelector("#loginPassword").value;
  const {error}=await cloudClient.auth.signInWithPassword({
    email:window.FAMILY_LOGIN_EMAIL,
    password
  });
  if(error)showAuthMessage("Passwort falsch oder Anmeldung nicht möglich.");
});

document.querySelector("#logoutBtn")?.addEventListener("click",async()=>{
  if(cloudClient)await cloudClient.auth.signOut();
  const pw=document.querySelector("#loginPassword");
  if(pw)pw.value="";
  showLoggedOut();
  window.scrollTo(0,0);
  // Browser erlauben window.close() normalerweise nur für Fenster, die per Script geöffnet wurden.
  // Falls die installierte PWA/Plattform es erlaubt, wird sie geschlossen; andernfalls bleibt sicher der Login-Bildschirm stehen.
  try{window.close();}catch(e){}
});


let viewportTimer=null;
function handleViewportChange(){
  clearTimeout(viewportTimer);
  viewportTimer=setTimeout(()=>{
    renderCalendar();
    // iOS can keep a dialog sized to the previous orientation until layout is touched.
    const dlg=document.querySelector("#editor");
    if(dlg?.open){
      dlg.style.maxHeight="none";
      requestAnimationFrame(()=>{dlg.style.maxHeight="calc(100dvh - 24px)";});
    }
  },120);
}
window.addEventListener("orientationchange",handleViewportChange);
window.addEventListener("resize",handleViewportChange);
window.visualViewport?.addEventListener("resize",handleViewportChange);


let familyPersonFilter="all";
const FAMILY_CATEGORIES=["Familie","Schule","Arzt","Privat","Arbeit","Freizeit","Veranstaltung","Sonstiges"];
const FAMILY_REMINDERS=[
 ["none","Keine"],["30m","30 Minuten vorher"],["1h","1 Stunde vorher"],["1d","1 Tag vorher"]
];
function eventStart(e){
  const t=e.startTime||"00:00";
  return new Date(`${e.date}T${t}:00`);
}
function familyCategoryIcon(category){
  const icons={
    "Familie":"👨‍👩‍👧",
    "Schule":"🎓",
    "Arzt":"🩺",
    "Privat":"👤",
    "Arbeit":"💼",
    "Freizeit":"🎯",
    "Veranstaltung":"🎉",
    "Sonstiges":"📌"
  };
  return icons[category]||"📌";
}
function familyPeopleText(e){
  const a=[...(e.people||[])];
  if(e.otherName)a.push(e.otherName);
  return a.join(", ")||"–";
}
function familyEventCard(e,past=false){
  const start=eventStart(e), date=start.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"});
  const time=e.startTime?`${e.startTime}${e.endTime?"–"+e.endTime:""} Uhr`:"ganztägig";
  return `<article class="family-event ${past?"past":""}" data-family-id="${e.id}">
    <div class="family-event-top"><div class="family-event-title-row"><span class="family-category-icon">${familyCategoryIcon(e.category)}</span><div class="family-event-title">${esc(e.title)}</div></div><div class="family-event-date">${date} · ${time}</div></div>
    <div class="family-event-meta">
      <span class="family-chip">👤 ${esc(familyPeopleText(e))}</span>
      <span class="family-chip">${esc(e.category||"Sonstiges")}</span>
      ${e.location?`<span>📍 ${esc(e.location)}</span>`:""}
      ${e.reminder&&e.reminder!=="none"?`<span>⏰ ${esc(FAMILY_REMINDERS.find(x=>x[0]===e.reminder)?.[1]||"Erinnerung")}</span>`:""}
    </div>
    ${e.note?`<div class="family-event-note">${esc(e.note)}</div>`:""}
  </article>`;
}
function renderFamily(){
  ensureFamilyData();
  const now=new Date();
  const matches=e=>familyPersonFilter==="all"||(e.people||[]).includes(familyPersonFilter)||(familyPersonFilter==="Sonstige"&&!!e.otherName);
  const all=[...data.familyEvents].filter(matches).sort((a,b)=>eventStart(a)-eventStart(b));
  const upcoming=all.filter(e=>eventStart(e)>=now);
  const past=all.filter(e=>eventStart(e)<now).reverse().slice(0,30);
  const u=document.querySelector("#familyUpcoming"),p=document.querySelector("#familyPast");
  if(u)u.innerHTML=upcoming.length?upcoming.map(e=>familyEventCard(e)).join(""):'<div class="empty">Keine kommenden Familientermine.</div>';
  if(p)p.innerHTML=past.length?past.map(e=>familyEventCard(e,true)).join(""):'<div class="empty">Keine vergangenen Termine.</div>';
  document.querySelectorAll("[data-family-id]").forEach(el=>el.addEventListener("click",()=>openFamilyEvent(el.dataset.familyId)));
}
function renderFamilyDashboard(){
  const el=document.querySelector("#nextFamilyEvents");if(!el)return;
  const now=new Date();
  const upcoming=[...data.familyEvents].filter(e=>eventStart(e)>=now).sort((a,b)=>eventStart(a)-eventStart(b)).slice(0,5);
  el.innerHTML=upcoming.length?upcoming.map(e=>familyEventCard(e)).join(""):'<div class="empty">Keine kommenden Familientermine.</div>';
  el.querySelectorAll("[data-family-id]").forEach(x=>x.addEventListener("click",()=>{setView("family");openFamilyEvent(x.dataset.familyId)}));
}
function reminderTime(e){
  const s=eventStart(e),r=e.reminder;
  if(r==="30m")return new Date(s-30*60*1000);
  if(r==="1h")return new Date(s-60*60*1000);
  if(r==="1d")return new Date(s-24*60*60*1000);
  return null;
}

async function updateReminderBadge(count){
  try{
    if(!("setAppBadge" in navigator))return;
    if(count>0)await navigator.setAppBadge(count);
    else if("clearAppBadge" in navigator)await navigator.clearAppBadge();
  }catch(e){
    console.debug("App-Badge nicht verfügbar:",e);
  }
}
function checkFamilyReminders(){
  const box=document.querySelector("#familyReminderBox");if(!box)return;
  const now=new Date();
  const due=data.familyEvents.filter(e=>{
    const rt=reminderTime(e),st=eventStart(e);
    return rt&&now>=rt&&now<=st;
  }).sort((a,b)=>eventStart(a)-eventStart(b));
  updateReminderBadge(due.length);
  if(!due.length){box.classList.add("hidden");box.innerHTML="";return;}
  box.classList.remove("hidden");
  box.innerHTML=`<strong>⏰ Erinnerungen</strong>`+due.map(e=>`<div class="reminder-item">${esc(e.title)} · ${eventStart(e).toLocaleString("de-DE",{dateStyle:"short",timeStyle:"short"})} · ${esc(familyPeopleText(e))}</div>`).join("");
}
function openFamilyEvent(id=null){
  const e=data.familyEvents.find(x=>x.id===id)||{
    id:null,title:"",date:localYMD(new Date()),startTime:"",endTime:"",category:"Familie",
    people:[],otherName:"",location:"",note:"",reminder:"none"
  };
  openEditor(id?"Familientermin bearbeiten":"Neuer Familientermin",`
    <label>Titel<input name="title" required value="${esc(e.title)}" placeholder="z. B. Elternabend"></label>
    <div class="form-grid">
      <label>Datum<input name="date" type="date" required value="${esc(e.date)}"></label>
      <label>Kategorie<select name="category">${FAMILY_CATEGORIES.map(c=>`<option ${c===e.category?"selected":""}>${c}</option>`).join("")}</select></label>
      <label>Startzeit<input name="startTime" type="time" value="${esc(e.startTime||"")}"></label>
      <label>Endzeit<input name="endTime" type="time" value="${esc(e.endTime||"")}"></label>
    </div>
    <label>Person(en)
      <div class="person-checks">
        ${["Lara","Bianca","Ivan"].map(n=>`<label class="person-check"><input type="checkbox" name="person" value="${n}" ${(e.people||[]).includes(n)?"checked":""}> ${n}</label>`).join("")}
        <label class="person-check"><input type="checkbox" id="otherPersonCheck" name="person" value="Sonstige" ${e.otherName?"checked":""}> Sonstige</label>
      </div>
    </label>
    <label id="otherNameWrap" class="${e.otherName?"":"hidden"}">Name bei Sonstige<input name="otherName" value="${esc(e.otherName||"")}" placeholder="z. B. Oma, Mutter, Schwiegervater"></label>
    <label>Ort<input name="location" value="${esc(e.location||"")}" placeholder="optional"></label>
    <label>Erinnerung<select name="reminder">${FAMILY_REMINDERS.map(([v,t])=>`<option value="${v}" ${v===e.reminder?"selected":""}>${t}</option>`).join("")}</select></label>
    <label>Notiz<textarea name="note" rows="3" placeholder="optional">${esc(e.note||"")}</textarea></label>
  `,form=>{
    const fd=new FormData(form);
    const people=fd.getAll("person").filter(x=>x!=="Sonstige");
    const otherSelected=fd.getAll("person").includes("Sonstige");
    const obj={
      id:e.id||uid(),title:fd.get("title").trim(),date:fd.get("date"),
      startTime:fd.get("startTime")||"",endTime:fd.get("endTime")||"",
      category:fd.get("category"),people,otherName:otherSelected?(fd.get("otherName")||"").trim():"",
      location:(fd.get("location")||"").trim(),note:(fd.get("note")||"").trim(),reminder:fd.get("reminder")
    };
    if(e.id)data.familyEvents=data.familyEvents.map(x=>x.id===e.id?obj:x);else data.familyEvents.push(obj);
    saveData();
  },id?()=>{if(confirm("Diesen Familientermin löschen?")){data.familyEvents=data.familyEvents.filter(x=>x.id!==id);saveData();closeEditor();}}:null);
  setTimeout(()=>{
    const chk=document.querySelector("#otherPersonCheck"),wrap=document.querySelector("#otherNameWrap");
    chk?.addEventListener("change",()=>wrap?.classList.toggle("hidden",!chk.checked));
  },0);
}
document.querySelectorAll(".family-filter").forEach(b=>b.addEventListener("click",()=>{
  familyPersonFilter=b.dataset.person;
  document.querySelectorAll(".family-filter").forEach(x=>x.classList.toggle("active",x===b));
  renderFamily();
}));
setInterval(()=>{if(document.visibilityState==="visible")checkFamilyReminders()},60000);
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible")checkFamilyReminders();
});
window.addEventListener("focus",checkFamilyReminders);

document.addEventListener("click",function(e){
  const btn=e.target.closest("#newFamilyEvent");
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  openFamilyEvent();
});



function keepEditorFieldVisible(target){
  if(!target?.closest?.("#editor"))return;
  setTimeout(()=>{
    target.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
  },280);
}
document.querySelector("#editor")?.addEventListener("focusin",e=>{
  if(e.target.matches("input,select,textarea"))keepEditorFieldVisible(e.target);
});
window.visualViewport?.addEventListener("resize",()=>{
  const active=document.activeElement;
  if(active?.matches?.("#editor input,#editor select,#editor textarea")){
    keepEditorFieldVisible(active);
  }
});


let cycleUnlocked=false;
function cyclePinHash(pin){let h=2166136261;for(const ch of pin){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function lockCycle(){cycleUnlocked=false;const i=document.querySelector("#cyclePinInput");if(i){i.value="";i.blur()}document.querySelector("#cycleLocked")?.classList.remove("hidden");document.querySelector("#cycleContent")?.classList.add("hidden");}
function setupCyclePin(){const a=prompt("Neue PIN (4–6 Ziffern):");if(a===null)return;if(!/^\d{4,6}$/.test(a)){alert("Bitte 4 bis 6 Ziffern verwenden.");return}const b=prompt("PIN wiederholen:");if(a!==b){alert("PINs stimmen nicht überein.");return}localStorage.setItem("lara_cycle_pin_hash",cyclePinHash(a));alert("PIN gespeichert.");}
function unlockCycle(pin){const s=localStorage.getItem("lara_cycle_pin_hash");const m=document.querySelector("#cyclePinMessage"),i=document.querySelector("#cyclePinInput");if(!s){if(m)m.textContent="Bitte zuerst eine PIN festlegen.";if(i)i.value="";return}if(cyclePinHash(pin)!==s){if(m)m.textContent="PIN ist nicht korrekt.";if(i){i.value="";i.focus()}return}cycleUnlocked=true;if(m)m.textContent="";if(i){i.value="";i.blur()}document.querySelector("#cycleLocked")?.classList.add("hidden");document.querySelector("#cycleContent")?.classList.remove("hidden");renderCycle();}
function cd(d){return new Date(d+"T12:00:00")} function cf(d){return d?cd(d).toLocaleDateString("de-DE"):"–"}
function renderCycle(){ensureCycleData();if(!cycleUnlocked)return;const a=[...data.cycleEntries].sort((x,y)=>x.startDate.localeCompare(y.startDate));const gaps=[];for(let i=1;i<a.length;i++){const n=Math.round((cd(a[i].startDate)-cd(a[i-1].startDate))/86400000);if(n>=15&&n<=60)gaps.push(n)}const avg=gaps.length?Math.round(gaps.reduce((x,y)=>x+y,0)/gaps.length):null,last=a.at(-1);let next=null;if(last&&avg){let d=cd(last.startDate);d.setDate(d.getDate()+avg);next=d.toISOString().slice(0,10)}document.querySelector("#cycleLastStart").textContent=last?cf(last.startDate):"–";document.querySelector("#cycleAverage").textContent=avg?avg+" Tage":"Noch nicht genug Daten";document.querySelector("#cycleNextEstimate").textContent=next?cf(next):"Noch nicht genug Daten";const l=document.querySelector("#cycleEntries");const r=[...a].reverse();l.innerHTML=r.length?r.map(e=>`<article class="cycle-entry" data-cycle-id="${e.id}"><div class="cycle-entry-top"><div class="cycle-entry-title">🌸 Periode</div><div class="cycle-entry-date">${cf(e.startDate)}${e.endDate?" – "+cf(e.endDate):""}</div></div><div class="cycle-entry-meta">${e.flow?`<span class="cycle-pill">Stärke: ${esc(e.flow)}</span>`:""}${e.symptoms?`<span class="cycle-pill">${esc(e.symptoms)}</span>`:""}${e.mood?`<span class="cycle-pill">${esc(e.mood)}</span>`:""}</div>${e.note?`<div class="cycle-entry-note">${esc(e.note)}</div>`:""}</article>`).join(""):'<div class="empty">Noch keine Einträge.</div>';l.querySelectorAll("[data-cycle-id]").forEach(x=>x.onclick=()=>openCycleEntry(x.dataset.cycleId));}
function openCycleEntry(id=null){if(!cycleUnlocked)return;const e=data.cycleEntries.find(x=>x.id===id)||{id:null,startDate:localYMD(new Date()),endDate:"",flow:"",symptoms:"",mood:"",note:""};openEditor(id?"Periodeneintrag bearbeiten":"Periode eintragen",`<div class="form-grid"><label>Beginn<input name="startDate" type="date" required value="${esc(e.startDate)}"></label><label>Ende<input name="endDate" type="date" value="${esc(e.endDate)}"></label></div><label>Stärke<select name="flow"><option value="">–</option>${["Leicht","Mittel","Stark"].map(x=>`<option ${x===e.flow?"selected":""}>${x}</option>`).join("")}</select></label><label>Beschwerden<input name="symptoms" value="${esc(e.symptoms)}" placeholder="optional"></label><label>Stimmung<input name="mood" value="${esc(e.mood)}" placeholder="optional"></label><label>Private Notiz<textarea name="note" rows="4">${esc(e.note)}</textarea></label>`,form=>{const f=new FormData(form),o={id:e.id||uid(),startDate:f.get("startDate"),endDate:f.get("endDate")||"",flow:f.get("flow")||"",symptoms:(f.get("symptoms")||"").trim(),mood:(f.get("mood")||"").trim(),note:(f.get("note")||"").trim()};if(o.endDate&&o.endDate<o.startDate){alert("Enddatum darf nicht vor Beginn liegen.");return}if(e.id)data.cycleEntries=data.cycleEntries.map(x=>x.id===e.id?o:x);else data.cycleEntries.push(o);saveData();renderCycle();},id?()=>{if(confirm("Eintrag löschen?")){data.cycleEntries=data.cycleEntries.filter(x=>x.id!==id);saveData();closeEditor();renderCycle();}}:null);}
document.querySelector("#cycleUnlockForm")?.addEventListener("submit",e=>{e.preventDefault();unlockCycle(document.querySelector("#cyclePinInput").value)});
document.querySelector("#cycleSetupPin")?.addEventListener("click",setupCyclePin);document.querySelector("#cycleLockBtn")?.addEventListener("click",lockCycle);document.querySelector("#newCycleEntry")?.addEventListener("click",()=>openCycleEntry());

function renderAll(){ensureFamilyData();ensureCycleData();renderDashboard();renderTasks();renderBooks();renderSubjects();renderCalendar();renderFamily();renderFamilyDashboard();checkFamilyReminders();renderCycle();}
renderAll();
initCloud();

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.warn));
