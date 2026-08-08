const classes=[
 {name:'Pra Mutiara Hati',level:'Prasekolah',icon:'✦',color:'#17c8ff'},
 {name:'Pra Delima Hati',level:'Prasekolah',icon:'●',color:'#0b5cff'},
 {name:'Pra Permata Hati',level:'Prasekolah',icon:'◆',color:'#4938dc'},
 ...Array.from({length:6},(_,i)=>({name:`Tahun ${i+1}`,level:'Sekolah Rendah',icon:String(i+1).padStart(2,'0'),color:['#5aaeff','#0050c8','#17c8ff','#0b5cff','#4938dc','#5aaeff'][i]}))
];
const $=id=>document.getElementById(id);
const todayString=()=>new Date().toLocaleDateString('en-CA');
const storeKey=(c,d)=>`skpmkas-attendance-v2:${c}:${d}`;
const teacherKey='skrg-class-teachers-v1';
const calendarKey='skrg-calendar-settings-v1';
const state={className:classes[0].name,date:todayString(),teacher:'',students:[],timer:null};
let teachers=readJson(teacherKey,{});
const currentYear=new Date().getFullYear();
let calendar=readJson(calendarKey,{year:currentYear,start:`${currentYear}-01-02`,end:`${currentYear}-12-15`,schoolDays:[1,2,3,4,5],holidays:[]});
let monthCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderClasses(){
 $('classGrid').innerHTML=classes.map(c=>`<article class="class-card" style="--accent:${c.color}" data-class="${esc(c.name)}"><div class="class-icon">${c.icon}</div><small>${c.level.toUpperCase()}</small><h3>${c.name}</h3><p>Rekod kelas dan kehadiran harian murid.</p><b>Isi kehadiran →</b></article>`).join('');
 document.querySelectorAll('.class-card').forEach(card=>card.onclick=()=>openAttendance(card.dataset.class,state.date));
}
function init(){
 renderClasses();renderTeacherGrid();initCalendar();
 $('classSelect').innerHTML=classes.map(c=>`<option>${c.name}</option>`).join('');
 $('dateInput').value=state.date;
 $('classSelect').onchange=e=>{state.className=e.target.value;load()};
 $('dateInput').onchange=e=>{state.date=e.target.value;load();monthCursor=new Date(`${state.date}T00:00:00`);monthCursor.setDate(1);renderCalendar()};
 $('teacherInput').oninput=e=>{state.teacher=e.target.value;teachers[state.className]=state.teacher;localStorage.setItem(teacherKey,JSON.stringify(teachers));renderTeacherGrid();scheduleSave()};
 $('addStudentBtn').onclick=()=>addStudents(1);$('emptyAddBtn').onclick=()=>addStudents(1);$('addTenBtn').onclick=()=>addStudents(10);
 $('markAllBtn').onclick=()=>{state.students.forEach(s=>s.status='Hadir');renderRows();scheduleSave();toast('Semua murid ditanda hadir')};
 $('exportBtn').onclick=exportCsv;load();
}
function openAttendance(className,date){state.className=className;state.date=date;$('classSelect').value=className;$('dateInput').value=date;load();document.querySelector('#kehadiran').scrollIntoView({behavior:'smooth'})}
function load(){
 state.students=[];state.teacher=teachers[state.className]||'';
 try{const saved=JSON.parse(localStorage.getItem(storeKey(state.className,state.date))||'null');if(saved){state.students=Array.isArray(saved.students)?saved.students:[];state.teacher=saved.teacher||state.teacher}}catch{}
 $('teacherInput').value=state.teacher;renderRows();updateLabel();renderHistory();
 $('saveTime').textContent=state.students.length?'Rekod tarikh ini dimuatkan':'Belum ada rekod untuk tarikh ini';
}
function addStudents(total){for(let i=0;i<total;i++)state.students.push({id:crypto.randomUUID?crypto.randomUUID():Date.now()+Math.random(),name:'',status:'',note:''});renderRows();scheduleSave();setTimeout(()=>document.querySelector('tbody tr:last-child .name-input')?.focus(),30);toast(total===1?'Satu baris murid ditambah':'10 baris murid ditambah')}
function renderRows(){
 const body=$('studentRows');
 body.innerHTML=state.students.map((s,i)=>`<tr data-id="${s.id}"><td>${i+1}</td><td><input class="name-input" value="${esc(s.name)}" placeholder="Nama penuh murid"></td><td><div class="statuses">${['Hadir','Lewat','Tidak hadir','Cuti / sakit'].map(x=>`<button class="status ${s.status===x?'active':''}" data-status="${x}">${x}</button>`).join('')}</div></td><td><input class="note-input" value="${esc(s.note)}" placeholder="Catatan pilihan"></td><td><button class="remove" title="Padam murid">✕</button></td></tr>`).join('');
 $('emptyState').style.display=state.students.length?'none':'block';body.parentElement.style.display=state.students.length?'table':'none';
 body.querySelectorAll('tr').forEach((row,i)=>{row.querySelector('.name-input').oninput=e=>{state.students[i].name=e.target.value;scheduleSave()};row.querySelector('.note-input').oninput=e=>{state.students[i].note=e.target.value;scheduleSave()};row.querySelectorAll('.status').forEach(b=>b.onclick=()=>{state.students[i].status=b.dataset.status;renderRows();scheduleSave()});row.querySelector('.remove').onclick=()=>{state.students.splice(i,1);renderRows();scheduleSave()}});updateSummary();
}
function scheduleSave(){clearTimeout(state.timer);$('saveBadge').classList.add('saving');$('saveBadge').querySelector('b').textContent='Sedang menyimpan…';state.timer=setTimeout(save,450)}
function save(){const payload={className:state.className,date:state.date,teacher:state.teacher,students:state.students,updatedAt:new Date().toISOString()};localStorage.setItem(storeKey(state.className,state.date),JSON.stringify(payload));$('saveBadge').classList.remove('saving');$('saveBadge').querySelector('b').textContent='Semua perubahan disimpan';$('saveTime').textContent=`Disimpan ${new Date().toLocaleTimeString('ms-MY',{hour:'2-digit',minute:'2-digit'})}`;updateSummary();updateLabel();renderHistory()}
function updateSummary(){const counts={'Hadir':0,'Lewat':0,'Tidak hadir':0,'Cuti / sakit':0,'':0};state.students.forEach(s=>counts[s.status]=(counts[s.status]||0)+1);$('countHadir').textContent=counts['Hadir'];$('countLewat').textContent=counts['Lewat'];$('countTidak').textContent=counts['Tidak hadir'];$('countCuti').textContent=counts['Cuti / sakit'];$('countBelum').textContent=counts['']}
function updateLabel(){const date=new Date(state.date+'T00:00:00').toLocaleDateString('ms-MY',{weekday:'long',day:'numeric',month:'long',year:'numeric'});$('recordLabel').textContent=`${state.className} · ${date} · ${state.teacher||'Guru belum ditetapkan'}`}
function renderHistory(){
 const records=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith('skpmkas-attendance-v2:'))continue;try{const item=JSON.parse(localStorage.getItem(key));if(item&&item.students?.length)records.push(item)}catch{}}
 records.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));const list=$('historyList');
 if(!records.length){list.innerHTML='<div class="history-empty">Belum ada rekod kehadiran. Pilih kelas, tambah nama murid dan rekod pertama akan muncul di sini.</div>';return}
 list.innerHTML=records.slice(0,12).map((r,i)=>`<button class="history-item" data-index="${i}"><strong>${esc(r.className)}</strong><small>${new Date(r.date+'T00:00:00').toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'})} · ${r.students.length} murid</small></button>`).join('');
 list.querySelectorAll('.history-item').forEach((button,i)=>button.onclick=()=>openAttendance(records[i].className,records[i].date));
}
function renderTeacherGrid(){
 $('teacherGrid').innerHTML=classes.map((c,i)=>`<article class="teacher-card"><header><span>👩‍🏫</span><div><strong>${c.name}</strong><small>${c.level}</small></div></header><label><span>Nama guru kelas</span><input data-index="${i}" value="${esc(teachers[c.name]||'')}" placeholder="Masukkan nama guru"></label></article>`).join('');
 $('teacherGrid').querySelectorAll('input').forEach(input=>input.oninput=e=>{const c=classes[Number(e.target.dataset.index)];teachers[c.name]=e.target.value;localStorage.setItem(teacherKey,JSON.stringify(teachers));if(state.className===c.name){state.teacher=e.target.value;$('teacherInput').value=state.teacher;scheduleSave()}});
}
function initCalendar(){
 $('sessionYear').innerHTML=Array.from({length:5},(_,i)=>currentYear-1+i).map(y=>`<option ${Number(calendar.year)===y?'selected':''}>${y}</option>`).join('');
 $('sessionStart').value=calendar.start||'';$('sessionEnd').value=calendar.end||'';
 $('sessionYear').onchange=e=>{calendar.year=Number(e.target.value);saveCalendar()};$('sessionStart').onchange=e=>{calendar.start=e.target.value;saveCalendar()};$('sessionEnd').onchange=e=>{calendar.end=e.target.value;saveCalendar()};
 $('addHolidayBtn').onclick=addHoliday;$('prevMonth').onclick=()=>{monthCursor.setMonth(monthCursor.getMonth()-1);renderCalendar()};$('nextMonth').onclick=()=>{monthCursor.setMonth(monthCursor.getMonth()+1);renderCalendar()};renderDayToggles();renderHolidays();renderCalendar();
}
function renderDayToggles(){const days=['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'];$('dayToggles').innerHTML=days.map((d,i)=>`<button class="day-toggle ${calendar.schoolDays.includes(i)?'active':''}" data-day="${i}">${d}</button>`).join('');$('dayToggles').querySelectorAll('button').forEach(b=>b.onclick=()=>{const day=Number(b.dataset.day);calendar.schoolDays=calendar.schoolDays.includes(day)?calendar.schoolDays.filter(x=>x!==day):[...calendar.schoolDays,day].sort();saveCalendar();renderDayToggles();renderCalendar()})}
function addHoliday(){const date=$('holidayDate').value,name=$('holidayName').value.trim();if(!date||!name)return toast('Isi tarikh dan nama cuti');calendar.holidays=calendar.holidays.filter(h=>h.date!==date);calendar.holidays.push({date,name});calendar.holidays.sort((a,b)=>a.date.localeCompare(b.date));$('holidayDate').value='';$('holidayName').value='';saveCalendar();renderHolidays();renderCalendar();toast('Cuti ditambah')}
function renderHolidays(){$('holidayList').innerHTML=calendar.holidays.length?calendar.holidays.map((h,i)=>`<div class="holiday-item"><span><strong>${esc(h.name)}</strong> · ${new Date(h.date+'T00:00:00').toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'})}</span><button data-index="${i}" aria-label="Padam ${esc(h.name)}">✕</button></div>`).join(''):'<div class="holiday-item"><span>Belum ada cuti ditetapkan.</span></div>';$('holidayList').querySelectorAll('button').forEach(b=>b.onclick=()=>{calendar.holidays.splice(Number(b.dataset.index),1);saveCalendar();renderHolidays();renderCalendar()})}
function saveCalendar(){localStorage.setItem(calendarKey,JSON.stringify(calendar))}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function renderCalendar(){
 const year=monthCursor.getFullYear(),month=monthCursor.getMonth();$('monthTitle').textContent=new Date(year,month,1).toLocaleDateString('ms-MY',{month:'long',year:'numeric'});
 const start=new Date(year,month,1);start.setDate(start.getDate()-start.getDay());const cells=[];
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d),holiday=calendar.holidays.find(h=>h.date===key),inMonth=d.getMonth()===month,isSchool=inMonth&&calendar.schoolDays.includes(d.getDay())&&!holiday;const classesDay=['calendar-day',!inMonth?'muted':'',isSchool?'school':'',holiday?'holiday':'',key===todayString()?'today':'',key===state.date?'selected':''].filter(Boolean).join(' ');cells.push(`<button class="${classesDay}" data-date="${key}" title="${holiday?esc(holiday.name):isSchool?'Hari persekolahan':''}">${d.getDate()}${isSchool||holiday?'<i></i>':''}</button>`)}
 $('calendarGrid').innerHTML=cells.join('');$('calendarGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>openAttendance(state.className,b.dataset.date));
}
function exportCsv(){if(!state.students.length)return toast('Tambah murid sebelum memuat turun');const rows=[['Kelas',state.className],['Tarikh',state.date],['Guru',state.teacher],[],['Bil','Nama murid','Status','Catatan'],...state.students.map((s,i)=>[i+1,s.name,s.status,s.note])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`kehadiran-${state.className.toLowerCase().replaceAll(' ','-')}-${state.date}.csv`;a.click();URL.revokeObjectURL(a.href);toast('Rekod CSV dimuat turun')}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}
init();
