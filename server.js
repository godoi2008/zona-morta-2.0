const express=require("express"),http=require("http"),{Server}=require("socket.io"),crypto=require("crypto");
const app=express(),server=http.createServer(app),io=new Server(server),PORT=process.env.PORT||3000;
app.use(express.static("public"));
const rooms=new Map(), chars=[
 {name:"O Soldado",emoji:"🪖",color:"#e16a5c",hp:5,ammo:3,meds:0,food:1},
 {name:"A Médica",emoji:"🩺",color:"#66a9d1",hp:5,ammo:1,meds:2,food:1},
 {name:"O Engenheiro",emoji:"🛠️",color:"#dfb95c",hp:5,ammo:1,meds:0,food:1},
 {name:"A Exploradora",emoji:"🧭",color:"#83b879",hp:5,ammo:2,meds:0,food:2}
];
const tiles=[
 ["Abrigo","🏚️","safe"],["Rua destruída","🛣️",""],["Sinal estranho","❗","event"],["Supermercado","🛒","loot"],["Zumbis","🧟","danger"],["Hospital","🏥","safe"],
 ["Bloqueio","🚧",""],["Suprimentos","📦","loot"],["Rádio quebrado","📡","event"],["Delegacia","🚔","safe"],
 ["Horda","🧟","danger"],["Posto","⛽","fuel"],["Beco","📦","loot"],["Rua alagada","🌧️",""],["Evento","❗","event"],["Oficina","🔧","safe"],
 ["Ataque","🧟","danger"],["Farmácia","💊","radio"],["Suprimentos","📦","loot"],["Bloqueio","🚧",""],["Evento","❗","event"],["Acampamento","⛺","safe"],
 ["Horda","🧟","danger"],["Depósito militar","🎖️","battery"],["Suprimentos","📦","loot"],["Zona contaminada","☣️","danger"],["Evento","❗","event"],["Entrada da base","🚪","safe"],
 ["Zumbi Alfa","👹","boss"],["Base militar","🚁","base"]
];
const code=()=>crypto.randomBytes(3).toString("hex").toUpperCase();
const clean=s=>String(s||"Sobrevivente").replace(/[<>]/g,"").slice(0,18);
function newPlayer(id,name,i){let c=chars[i];return{id,name:clean(name),character:c.name,emoji:c.emoji,color:c.color,pos:0,hp:c.hp,ammo:c.ammo,meds:c.meds,food:c.food,fuel:false,battery:false,radio:false,alive:true,shield:0,skillUsed:false};}
function pub(r){return{code:r.code,started:r.started,turn:r.turn,round:r.round,players:r.players.map(p=>({...p})),log:r.log.slice(-18),winner:r.winner,bossHP:r.bossHP,lastRoll:r.lastRoll,tiles};}
function say(r,s){r.log.push(s);if(r.log.length>50)r.log.shift();}
function send(r){io.to(r.code).emit("state",pub(r));}
function findRoom(id){return [...rooms.values()].find(r=>r.players.some(p=>p.id===id));}
function active(r,id){return r.players[r.turn]?.id===id;}
function endTurn(r){r.turn=(r.turn+1)%r.players.length;if(r.turn===0)r.round++;r.lastRoll=null;say(r,`Rodada ${r.round}: vez de ${r.players[r.turn].name}.`);}
function damage(p,n,r){let blocked=Math.min(p.shield,n);p.shield-=blocked;n-=blocked;p.hp=Math.max(0,p.hp-n);if(blocked)say(r,`${p.name} bloqueou ${blocked} de dano.`);if(p.hp===0){p.alive=false;say(r,`${p.name} foi eliminado.`);}}
function allDead(r){if(r.players.every(p=>!p.alive)){r.winner="A Horda";say(r,"A horda tomou Nova Esperança. Todos foram eliminados.");}}
function event(r,p){let n=Math.floor(Math.random()*6);const e=[
()=>{damage(p,1,r);say(r,"EVENTO: vidro quebrado! Você perdeu 1 de vida.");},
()=>{p.food++;say(r,"EVENTO: mochila esquecida. +1 comida.");},
()=>{p.ammo++;say(r,"EVENTO: caixa de munição. +1 munição.");},
()=>{p.hp=Math.min(5,p.hp+1);say(r,"EVENTO: voluntário médico. +1 vida.");},
()=>{p.shield++;say(r,"EVENTO: encontrou proteção improvisada. +1 escudo.");},
()=>{p.pos=Math.max(0,p.pos-1);say(r,"EVENTO: rua bloqueada! Volte uma casa.");}
];e[n]();}
io.on("connection",s=>{
 s.on("createRoom",({name},cb)=>{let c=code();while(rooms.has(c))c=code();let r={code:c,players:[newPlayer(s.id,name,0)],started:false,turn:0,round:1,log:[],winner:null,bossHP:6,lastRoll:null};rooms.set(c,r);s.join(c);say(r,`${r.players[0].name} abriu um abrigo. Código: ${c}.`);cb({ok:true,code:c,state:pub(r),playerId:s.id});send(r);});
 s.on("joinRoom",({code:c,name},cb)=>{let r=rooms.get(String(c||"").toUpperCase());if(!r)return cb({ok:false,error:"Código de sala não encontrado."});if(r.started)return cb({ok:false,error:"A partida já começou."});if(r.players.length>=4)return cb({ok:false,error:"A sala está cheia."});let p=newPlayer(s.id,name,r.players.length);r.players.push(p);s.join(r.code);say(r,`${p.name} chegou ao abrigo.`);cb({ok:true,code:r.code,state:pub(r),playerId:s.id});send(r);});
 s.on("startGame",cb=>{let r=findRoom(s.id);if(!r)return cb({ok:false,error:"Entre em uma sala."});if(r.players[0].id!==s.id)return cb({ok:false,error:"Só o anfitrião pode iniciar."});if(r.players.length<2)return cb({ok:false,error:"São necessários pelo menos 2 jogadores."});r.started=true;say(r,"ALERTA DE EMERGÊNCIA: encontrem combustível, bateria e rádio. O resgate aguarda na base.");cb({ok:true});send(r);});
 s.on("action",({type},cb)=>{let r=findRoom(s.id);if(!r||!r.started||r.winner)return cb({ok:false,error:"Partida indisponível."});if(!active(r,s.id))return cb({ok:false,error:"Aguarde sua vez."});let p=r.players[r.turn];if(!p.alive)return cb({ok:false,error:"Seu personagem foi eliminado."});
 if(type==="roll"){if(r.lastRoll!==null)return cb({ok:false,error:"Você já lançou o dado."});let roll=1+Math.floor(Math.random()*6);r.lastRoll=roll;let bonus=p.character==="A Exploradora"&&!p.skillUsed?1:0;p.skillUsed=true;p.pos=Math.min(29,p.pos+roll+bonus);say(r,`${p.emoji} ${p.name} lançou ${roll}${bonus?"+1 habilidade":""} e chegou ao setor ${p.pos+1}.`);let t=p.pos+1;
 if([4,8,13,19,25].includes(t)){let k=["food","ammo","meds"][Math.floor(Math.random()*3)];p[k]++;say(r,`Busca concluída: ${k==="food"?"comida":k==="ammo"?"munição":"medicamento"} +1.`);}
 if([3,9,15,21,27].includes(t))event(r,p);
 if([5,11,17,23,26].includes(t)){let hit=Math.random()<.55;if(hit){if(p.ammo>0){p.ammo--;say(r,"Você disparou e afastou a ameaça. Munição -1.");}else{damage(p,1,r);say(r,"Um zumbi avançou! Você perdeu 1 de vida.");}}else say(r,"Você se escondeu e passou despercebido.");}
 if(t===12&&!p.fuel){p.fuel=true;say(r,"⛽ COMBUSTÍVEL encontrado!");}
 if(t===24&&!p.battery){p.battery=true;say(r,"🔋 BATERIA encontrada no depósito militar!");}
 if(t===18&&!p.radio){p.radio=true;say(r,"📻 RÁDIO encontrado na farmácia!");}
 if(t===29){say(r,"O ZUMBI ALFA bloqueia a entrada! Use a ação ATACAR para enfrentá-lo.");}
 if(t===30){if(p.fuel&&p.battery&&p.radio&&r.bossHP<=0){r.winner=p.name;say(r,`RESGATE! ${p.name} escapou de Nova Esperança!`);}else{p.pos=28;say(r,"A base está trancada. Você precisa dos 3 equipamentos e derrotar o Zumbi Alfa. Recuou para a entrada.");}}
 if(p.hp<=0)p.alive=false;allDead(r);send(r);return cb({ok:true,roll});}
 if(type==="attack"){if(p.pos!==28)return cb({ok:false,error:"Você precisa estar no setor 29, diante do Zumbi Alfa."});if(r.bossHP<=0)return cb({ok:false,error:"O Zumbi Alfa já foi derrotado."});let hit=1+(p.ammo>0?1:0)+(p.character==="O Soldado"?1:0);if(p.ammo>0)p.ammo--;r.bossHP=Math.max(0,r.bossHP-hit);say(r,`${p.name} atacou o Zumbi Alfa e causou ${hit} de dano! Vida do chefe: ${r.bossHP}.`);if(r.bossHP>0&&Math.random()<.5){damage(p,1,r);say(r,"O Zumbi Alfa contra-atacou!");}if(r.bossHP===0)say(r,"O ZUMBI ALFA FOI DERROTADO! Corram para o helicóptero!");allDead(r);send(r);return cb({ok:true});}
 if(type==="heal"){if(p.meds<1||p.hp>=5)return cb({ok:false,error:"Sem medicamento ou vida completa."});p.meds--;let heal=p.character==="A Médica"?2:1;p.hp=Math.min(5,p.hp+heal);say(r,`${p.name} usou medicamento e recuperou ${heal} de vida.`);send(r);return cb({ok:true});}
 if(type==="eat"){if(p.food<1||p.hp>=5)return cb({ok:false,error:"Sem comida ou vida completa."});p.food--;p.hp=Math.min(5,p.hp+1);say(r,`${p.name} comeu e recuperou 1 de vida.`);send(r);return cb({ok:true});}
 if(type==="end"){if(r.lastRoll===null)return cb({ok:false,error:"Lance o dado antes de encerrar a vez."});endTurn(r);send(r);return cb({ok:true});}
 cb({ok:false,error:"Ação inválida."});});
 s.on("disconnect",()=>{let r=findRoom(s.id);if(r){let p=r.players.find(x=>x.id===s.id);if(p){p.connected=false;say(r,`${p.name} perdeu conexão. A partida continua aguardando o retorno.`);send(r);}}});
});
server.listen(PORT,()=>console.log(`Zona Morta online na porta ${PORT}`));
