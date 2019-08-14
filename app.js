const express = require('express')
const http = require('http')
const socketIO = require('socket.io');

var crypto = require("crypto");

  

const firebase = require('firebase-admin')
var serviceAccount = require('./block-breaker-project-key.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://block-breaker-project.firebaseio.com"
});

var db = firebase.database();
var ref = db.ref("/users");
//once = get data once, on = get every time change occures
//The value event is called every time data is changed at the specified database reference
ref.once("value", function(snapshot) {
  console.log(snapshot.val());
});

// our localhost port
const port = process.env.PORT || 3004;

const app = express();
app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

// our server instance
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

// This creates our socket using the instance of the server
const io = socketIO(server);
// io.origins('*:*'); // for latest version
const height=600;
const width=600;
// let sequenceNumberByClient = new Map();
// This is what the socket.io syntax is like, we will work this later
var onlineusers = new Map();
var activegames =new Map();

var publicplayersdetails=new Map();// what clients should be able to see about other playes

var queue = [];
var bots = [];

var getusername=(id)=>{
  var useriterator = onlineusers[Symbol.iterator]();
  for (let user of useriterator) {
    if(id==user[1].id){
      return user[1].username;
    }
  }
  return null;
}
var getidbyusername=(username)=>{
  var useriterator = onlineusers[Symbol.iterator]();
  for (let user of useriterator) {
    if(username==user[1].username){
      return user[1].id;
    }
  }
  return null;
}
function getidbynickname(nickname){
  var useriterator = onlineusers[Symbol.iterator]();
  for (let user of useriterator) {
    if(nickname==user[1].nickname){
      return user[1].id;
    }
  }
  return null;
};
var isbot={TRUE:true,FALSE:false};
class Rectangle {
  constructor(score,posx,posy,width, height,dx,dy) {
    this.score=score;
    this.height = height;
    this.width = width;
    this.posx=posx;
    this.posy=posy;
    this.dx=dx;
    this.dy=dy;
    this.lasttouched='player1';
  }
};
class Player{
  constructor(socket,username,id,nickname,isbot){
    this.socket=socket;
    this.username=username;
    this.id=id;
    this.nickname=nickname;
    this.isbot=isbot;
  }
};
function countdown(e){
  if(e.message>0){
    e.message=e.message-1;
    setTimeout(countdown,1000,e);
  }
}

var Msg_all_but_me=()=>{
  onlineusers.forEach((val,key)=>{
    
    let userarr=[];
    let me;
    console.log(publicplayersdetails);
    publicplayersdetails.forEach((v,k)=>{
      if(k!=key){
        console.log(k,'!=',key);
        userarr.push(v);
      }else{
        me=v;
      }
    });
    val.socket.emit('users',{users:userarr,me:me});

  });
}
function startgame(player1id,player2id){
  var blocks=[
    new Rectangle(10,0,262.5,50,25),
    new Rectangle(10,50,262.5,50,25),
    new Rectangle(10,100,262.5,50,25),
    new Rectangle(10,150,262.5,50,25),
    new Rectangle(10,200,262.5,50,25),
    new Rectangle(10,250,262.5,50,25),
    new Rectangle(10,300,262.5,50,25),
    new Rectangle(10,350,262.5,50,25),
    new Rectangle(10,400,262.5,50,25),
    new Rectangle(10,450,262.5,50,25),
    new Rectangle(10,500,262.5,50,25),
    new Rectangle(10,550,262.5,50,25),

    new Rectangle(20,0,287.5,50,25),
    new Rectangle(20,50,287.5,50,25),
    new Rectangle(20,100,287.5,50,25),
    new Rectangle(30,150,287.5,50,25),
    new Rectangle(30,200,287.5,50,25),
    new Rectangle(40,250,287.5,50,25),
    new Rectangle(40,300,287.5,50,25),
    new Rectangle(30,350,287.5,50,25),
    new Rectangle(30,400,287.5,50,25),
    new Rectangle(20,450,287.5,50,25),
    new Rectangle(20,500,287.5,50,25),
    new Rectangle(20,550,287.5,50,25),

    new Rectangle(10,0,312.5,50,25),
    new Rectangle(10,50,312.5,50,25),
    new Rectangle(10,100,312.5,50,25),
    new Rectangle(10,150,312.5,50,25),
    new Rectangle(10,200,312.5,50,25),
    new Rectangle(10,250,312.5,50,25),
    new Rectangle(10,300,312.5,50,25),
    new Rectangle(10,350,312.5,50,25),
    new Rectangle(10,400,312.5,50,25),
    new Rectangle(10,450,312.5,50,25),
    new Rectangle(10,500,312.5,50,25),
    new Rectangle(10,550,312.5,50,25),
  ];
  console.log(onlineusers);
  activegames.set(player1id,{
    board:{
          player1:new Rectangle(0,250,550,100,30),
          player1score:0,
          player2score:0,
          player2:new Rectangle(0,250,50-30,100,30),
          blocks:blocks,
          balls:[new Rectangle(0,150,350,25,25,2,2),new Rectangle(0,width-150,height-350-25,25,25,-2,-2)],
        },
    isover:false,
    HasWon:false,
    opponent:onlineusers.get(player2id).username,
    isplayer1:true,
    message:'3',
  });
  activegames.set(player2id,{
      board:activegames.get(player1id).board,
      isplayer1:false,
      isover:false,
      HasWon:false,
      opponent:onlineusers.get(player1id).username,
      message:3,
    });
  onlineusers.get(player1id).socket.emit('acceptgame', {opponent:onlineusers.get(player1id).username,HasAccepted:true});
  if(!onlineusers.get(player2id).isbot)
    onlineusers.get(player2id).socket.emit('acceptgame', {opponent:onlineusers.get(player2id).username,HasAccepted:true});
  setTimeout(countdown,1000,activegames.get(player1id));
  setTimeout(countdown,1000,activegames.get(player2id));
};
io.on('connection', socket => {
  console.info(`Client connected [id=${socket.id}]`);
  // just like on the client side, we have a socket.on method that takes a callback function
  socket.on('change username', async (username) => {
    var text='ok';
    let nick='';
      await ref.child(username).once("value", (data)=> {
        if(!data.hasChild("nickname")){
          text='Please select a nickname';
        }
        else{
           nick=data.val().nickname;
          }
      }).catch((e)=>{console.error(e)});
    if(username==='nigger'||username===''){
        text='bad';
    }
    if(onlineusers.has(socket.id)){
      text='fatal error';
    }//do else
    onlineusers.forEach((value,key,map)=>{
      if(value.username===username){
        text='username taken';
      }
    });
    if(text==='ok'){
      onlineusers.set(socket.id,new Player(socket,username,socket.id,nick,isbot.FALSE));
      ref.child(getusername(socket.id)).once("value").then((data)=> {
        publicplayersdetails.set(socket.id,{username:getusername(socket.id),nickname:nick,details:data.val()})
        Msg_all_but_me();
      }).catch((e)=>{console.error(e); return null;});
    }
    socket.emit('change username', text);
    console.log(onlineusers);
  });
  socket.on('facebooklogin', async (data) => {
    console.log('A client has attempted to login with facebook');
    let nick="";
    await ref.child(data.uid).once("value", async (snapshot)=> {
      let text='ok';
      if(!snapshot.exists()){
        text='Please select a nickname';
        await ref.child(data.uid).set({email:data.email,
          password:null,
          wins:0,
          losses:0});
      }
      await ref.child(data.uid).once("value", async (snapshot)=> {
        if(!snapshot.hasChild("nickname")){
          text='Please select a nickname';
        }
        else{
          nick=snapshot.val().nickname;
        }
      });
      onlineusers.forEach((value,key,map)=>{
      if(value.username===data.uid){
        text='username taken';
      }
    });
      socket.emit('change username', text);
      if(text=='ok'){
        onlineusers.set(socket.id,new Player(socket,data.uid,socket.id,nick,isbot.FALSE));
        ref.child(getusername(socket.id)).once("value").then((data)=> {
          publicplayersdetails.set(socket.id,{username:getusername(socket.id),nickname:nick,details:data.val()});
          Msg_all_but_me();
        }).catch((e)=>{console.log(e); return null;});
      }
    });
  });
  //data recieves object {email,password,wins,loses}
  socket.on('NewLogin', (data) => {
    console.log('New account created:');
    console.log(data);
    let obj={};
    ref.child(data.uid).set({email:data.email,
                            password:data.password,
                            wins:0,
                            losses:0});
  });
  socket.on('Nickname', async(data) => {
    var isok = 'ok';
    await ref.once("value", (snapshot) =>{
      let keys = Object.keys(snapshot.val());
      for(let i =0;i<keys.length;i++){
        
        console.log(snapshot.val()[keys[i]].nickname);
        if(snapshot.val()[keys[i]].nickname==data.nickname){
          isok='Please select a different nickname';
        }
      }
    });
    if(isok=='ok'){
      console.log('adding player:',data.nickname);
      onlineusers.set(socket.id,new Player(socket,data.uid,socket.id,data.nickname,isbot.FALSE));
      
      await ref.child(data.uid).once('value',async (snapshot)=>{
        let newval = snapshot.val();
        newval.nickname=data.nickname;
        await ref.child(data.uid).set(newval);
        
      });
      await ref.child(getusername(socket.id)).once("value").then((snapshot)=> {
        publicplayersdetails.set(socket.id,{username:getusername(socket.id),nickname:data.nickname,details:snapshot.val()})
        Msg_all_but_me();
      }).catch((e)=>{console.error(e); return null;});

      socket.emit('change username', isok);
    } 
  });
  socket.on('gamemousemove', (data) => {  
    if(activegames.get(socket.id)){
      if(activegames.get(socket.id).isplayer1){
        activegames.get(socket.id).board.player1.posx=data.x-50;
      }
      else activegames.get(socket.id).board.player2.posx=data.x-50;
    }
  });
  socket.on('chatmessage', (data) => {
    io.sockets.emit('chatmessage',{nickname:onlineusers.get(socket.id).nickname,message:data});
  });
  //recieves object containing the opponent id, and boolean whether they accepted {opponent:string,HasAccepted:bool}
  //accept games occures if a player has accepted someone else's request.
  socket.on('acceptgame', (data) => {
    if(data.HasAccepted){
      console.log(getusername(socket.id),'has accepted '+data.opponent+"'s"+' game');
      startgame(socket.id,onlineusers.get(getidbynickname(data.opponent)).id);
    }
    else{
      onlineusers.get(getidbynickname(data.opponent)).socket.emit('acceptgame', {opponent:data,HasAccepted:false});
    }
  });
  //data is the opponents socket id
  socket.on('requestgame', (data) => {
    let requesterusername=data;
    let mynickname=onlineusers.get(socket.id).nickname;
    if(mynickname!=null&&!activegames.get(getidbyusername(data))){
      console.log('game request detected');
      console.log(data);
      onlineusers.forEach((value,key,map)=>{
        if(data==value.username&&socket.id!=key){
          value.socket.emit('requestgame', mynickname);
        }
      })
    }else{
      socket.emit('change username','that client is either offline or ingame');
    }
  });
  socket.on('quickmatch', (data) => {
    console.log("player has join the quickmatch queue");
    try {
      if(queue.length>=1&&(!queue.includes(socket.id))){
        let rival = queue.pop();
        console.log('found match between',socket.id,'and',rival);
        startgame(socket.id,rival);
      }
      else{
        console.log('adding player:',socket.id,'to queue.');
        queue.push(socket.id);
      }
    } catch (error) {
      console.error(error);
      socket.emit('servermessage',error);
    }
  });
  socket.on('stopqueue', (data) => {
    console.log("player requested to stop quickmatch");
    let index = queue.indexOf(socket.id);
    if (index > -1) {
      console.log('ending bot:',queue.splice(index, 1));
      }
  });
  socket.on('logout', () => {
    onlineusers.delete(socket.id);
  });
  socket.on('matchvsai', (data) => {
    console.log("player requested match versus ai");
    var botid;
    do{
      botid = crypto.randomBytes(5).toString('hex');
    }while(bots.includes(botid));
    bots.push(botid);
    onlineusers.set(botid,new Player(null,null,botid,'Easy bot',isbot.TRUE));
    startgame(socket.id,botid);
  });
  // disconnect is fired when a client leaves the server
  socket.on('disconnect', async () => {
    // console.log('user disconnected')
        console.info(`Client gone [id=${socket.id}]`);
        if(activegames.get(socket.id)){
          let opponentname = activegames.get(socket.id).opponent;
          activegames.get(socket.id).isover=true;
          activegames.get(getidbyusername(opponentname)).isover=true;
          activegames.get(getidbyusername(opponentname)).HasWon=true;
          onlineusers.get(getidbyusername(opponentname)).socket.emit('gameupdate',activegames.get(getidbyusername(opponentname)));
          activegames.delete(socket.id);
          activegames.delete(getidbyusername(opponentname));
          onlineusers.get(getidbyusername(opponentname)).socket.emit('change username', 'Opponent has left');
        }
        let index = queue.indexOf(socket.id);
        if (index > -1)
          console.log('removed:',queue.splice(index, 1));
        onlineusers.delete(socket.id);
        publicplayersdetails.delete(socket.id);
    
        // io.sockets.emit('users',newarray);
        // io.sockets.emit('users',Array.from( publicplayersdetails.values() ));
        Msg_all_but_me();
  })
});
var addwin= (uid)=>{
  ref.child(uid).once("value").then((snapshot)=> {
    if(snapshot.exists()){
      let res=snapshot.val();
      res.wins=res.wins+1;
      ref.child(uid).set(res);
      publicplayersdetails.set(getidbynickname(res.nickname),{username:uid,nickname:res.nickname,details:res});
      console.log("messgin",getidbynickname(res.nickname),":");
      console.log(publicplayersdetails.get(getidbynickname(res.nickname)));
      Msg_all_but_me();
    }
  });
};
var addlose=(uid)=>{
  ref.child(uid).once("value").then((snapshot)=> {
    if(snapshot.exists()){
      let res=snapshot.val();
      res.losses=res.losses+1;
      ref.child(uid).set(res);
      publicplayersdetails.set(getidbynickname(res.nickname),{username:uid,nickname:res.nickname,details:res});
      console.log("messgin",getidbynickname(res.nickname),":");
      console.log(publicplayersdetails.get(getidbynickname(res.nickname)));
      Msg_all_but_me();
    }
  });
};
var detectcollision=(ball,brick,dx,dy)=>{
  if(ball.posx >=brick.posx &&
    ball.posx <= brick.posx+brick.width &&
    ball.posy >= brick.posy &&
    ball.posy <= brick.posy+brick.height) {
        return true;
  }
  else if(ball.posx+ball.width >= brick.posx &&
    ball.posx+ball.width <= brick.posx+brick.width &&
    ball.posy >= brick.posy &&
    ball.posy <= brick.posy+brick.height) {
        return true;
  }
  if(ball.posx >= brick.posx &&
    ball.posx <= brick.posx+brick.width &&
    ball.posy+ball.height >= brick.posy &&
    ball.posy+ball.height <= brick.posy+brick.height) {
        return true;
  }
  else if(ball.posx+ball.width >= brick.posx &&
    ball.posx+ball.width <=brick.posx+brick.width &&
    ball.posy+ball.height >= brick.posy &&
    ball.posy+ball.height <= brick.posy+brick.height) {
        return true;
  }
  return false;  
}
setInterval(()=>{
  activegames.forEach((value,key,map)=>{
      if(activegames.get(key).message==0){
        if(onlineusers.get(key).isbot){
          let closestball=value.board.balls[0];
          for(let i=1;i<value.board.balls.length;i++){
            if(value.board.balls[i].posy<closestball.posy){
              closestball=value.board.balls[i];
            }
          }
          //bots is always player2
          let goal=closestball.posx+(closestball.width/2)-(value.board.player2.width/2) 
                    +(Math.floor((Math.random() *(value.board.player2.width/2)+1)))*(Math.round(Math.random()) * 2 - 1);
          let speed=16;
          if( Math.abs( (closestball.posx + (closestball.width/2) ) - (value.board.player2.posx + (value.board.player2.width/2)) ) < (value.board.player2.width/2) ){
            speed=3;
          }
          if(goal>value.board.player2.posx){
            value.board.player2.posx+=speed;
          }
          else{
            value.board.player2.posx-=speed;
          }
        }
        for (let i = 0; i < value.board.balls.length; i++) {
          value.board.balls[i].posx+=value.board.balls[i].dx;
          value.board.balls[i].posy+=value.board.balls[i].dy;
          //check for top right collision
          if(value.board.balls[i].posx+value.board.balls[i].dx >= value.board.player2.posx &&
            value.board.balls[i].posx+value.board.balls[i].dx <= value.board.player2.posx+value.board.player2.width &&
            value.board.balls[i].posy+value.board.balls[i].dy >= value.board.player2.posy &&
            value.board.balls[i].posy+value.board.balls[i].dy <= value.board.player2.posy+value.board.player2.height) {
              value.board.balls[i].posy=value.board.player2.posy+value.board.player2.height;
              value.board.balls[i].lasttouched='player2';
              console.log('p2 topright');
              let dist = Math.sqrt(Math.pow((value.board.balls[i].posx+(value.board.balls[i].width/2))-(value.board.player2.posx+(value.board.player2.width/2)),2)+Math.pow(0,2));
              if(dist>(value.board.player2.width/2)){// aka dist>50
                dist =value.board.player2.width/2;
              }
              //check if is left or right by comparing centres
              if((value.board.balls[i].posx+(value.board.balls[i].width/2))<=(value.board.player2.posx+(value.board.player2.width/2))){
                // balls[i] center is left of player1 center
                dist = -dist;
              }
              dist = dist/50;
              value.board.balls[i].dx=dist*4;
              dist = Math.abs(dist);
              
              //Result := ((Input - InputLow) / (InputHigh - InputLow))
              // * (OutputHigh - OutputLow) + OutputLow;
              let result = ((dist - 0)/(1 - 0 ))*(0.75 - 0) + 0; //4(1-x)
              value.board.balls[i].dy = Math.abs(4*(1-result));
          }
          //check for top left
          else if(value.board.balls[i].posx+value.board.balls[i].width >= value.board.player2.posx &&
            value.board.balls[i].posx+value.board.balls[i].width <= value.board.player2.posx+value.board.player2.width &&
            value.board.balls[i].posy >= value.board.player2.posy &&
            value.board.balls[i].posy <= value.board.player2.posy+value.board.player2.height) {
              value.board.balls[i].lasttouched='player2';
              value.board.balls[i].posy=value.board.player2.posy+value.board.player2.height;
              value.board.balls[i].dy=1;
              value.board.balls[i].dx=-4;
          }
          // right
          if(value.board.balls[i].posx >= value.board.player1.posx &&
            value.board.balls[i].posx <= value.board.player1.posx+value.board.player1.width &&
            value.board.balls[i].posy+value.board.balls[i].height >= value.board.player1.posy &&
            value.board.balls[i].posy+value.board.balls[i].height <= value.board.player1.posy+value.board.player1.height) {
              value.board.balls[i].lasttouched='player1';
              value.board.balls[i].posy=value.board.player1.posy-value.board.balls[i].height;
              let dist = Math.sqrt(Math.pow((value.board.balls[i].posx+(value.board.balls[i].width/2))-(value.board.player1.posx+(value.board.player1.width/2)),2)+Math.pow(0,2));
              if(dist>(value.board.player1.width/2)){// aka dist>50
                dist =value.board.player1.width/2;
              }
              //check if is left or right by comparing centres
              if((value.board.balls[i].posx+(value.board.balls[i].width/2))<=(value.board.player1.posx+(value.board.player1.width/2))){
                // ball center is left of player1 center
                dist = -dist;
              }
              // now dist is from -0 ... 50 , we gonna set it from -1 to 1
              dist = dist/50;
              console.log('botleft',dist);
              value.board.balls[i].dx=dist*4;
              
              dist = Math.abs(dist);
              //Result := ((Input - InputLow) / (InputHigh - InputLow))
              // * (OutputHigh - OutputLow) + OutputLow;
              let result = ((dist - 0)/(1 - 0 ))*(0.75 - 0) + 0; //4(1-x)
              // value.board.balls[i].dy = -4*(1-result);
              value.board.balls[i].dy = -Math.abs(4*(1-result));            
          }
          // left
          else if(value.board.balls[i].posx+value.board.balls[i].width >= value.board.player1.posx &&
            value.board.balls[i].posx+value.board.balls[i].width <= value.board.player1.posx+value.board.player1.width &&
            value.board.balls[i].posy+value.board.balls[i].height >= value.board.player1.posy &&
            value.board.balls[i].posy+value.board.balls[i].height <= value.board.player1.posy+value.board.player1.height) {
              value.board.balls[i].lasttouched='player1';
              value.board.balls[i].dy=-1;
              value.board.balls[i].posy=value.board.player1.posy-value.board.balls[i].height;
              value.board.balls[i].dx=-4;
          }  
          if(value.board.balls[i].posx+value.board.balls[i].width>=width ||value.board.balls[i].posx<=0){ 
            value.board.balls[i].dx= -value.board.balls[i].dx;
          }
          
          // IF goal was hit
          if(value.board.balls[i].posy+value.board.balls[i].height>=height ||value.board.balls[i].posy<=0){
            console.log('loser detected');
            if(value.board.balls[i].posy<=0){
              console.log('player2 lost')
              if(value.isplayer1){
                value.HasWon=true;
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              
              }else{
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).HasWon=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }
            }
            else{
              console.log('player1 lost');
              if(value.isplayer1){  
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).HasWon=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }else{
                value.HasWon=true;
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }
            }
            value.board.balls[i].dy= -value.board.balls[i].dy;
          }
          else if(value.board.blocks.length==0){
            if(value.board.player1score>value.board.player2score){
              if(value.isplayer1){
                value.HasWon=true;
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }else{
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).HasWon=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }
            }
            else{
              console.log('player1 lost');
              if(value.isplayer1){  
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).HasWon=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }else{
                value.HasWon=true;
                value.isover=true;
                activegames.get(getidbyusername(value.opponent)).isover=true;
              }
            }
          }
          ////////////////////////////////////////////////////////// end of win condition
          
          ////// start of collision detection
          var tempball = JSON.parse(JSON.stringify(value.board.balls[i]));//cloning ball
          
          tempball.posx+=value.board.balls[i].dx;
          tempball.posy+=value.board.balls[i].dy;
          let blockstoremove=[];
          for (let index = 0; index < value.board.blocks.length; index++) {
            if(detectcollision(tempball,value.board.blocks[index])){
              let score = value.board.blocks[index].score;
              blockstoremove.push(index);
              if(value.board.balls[i].lasttouched==='player1'){
                value.board.player1score+=score;
              }
              else{
                value.board.player2score+=score;
              }
              if ((value.board.blocks[index].posy > tempball.posy) && (value.board.blocks[index].posy <= tempball.posy + tempball.height)&&
              ((value.board.blocks[index].posx+value.board.blocks[index].width) <= (tempball.posx+tempball.width)) && (tempball.posx<=value.board.blocks[index].posx+value.board.blocks[index].width)){
                //top and right
                if((value.board.blocks[index].posy-tempball.posy)==(tempball.posx+tempball.width-(value.board.blocks[index].posx+value.board.blocks[index].width))){
                  value.board.balls[i].dx= Math.abs(value.board.balls[i].dx);
                  value.board.balls[i].dy= -Math.abs(value.board.balls[i].dy);
                }
                else if((value.board.blocks[index].posy-tempball.posy)>(tempball.posx+tempball.width-(value.board.blocks[index].posx+value.board.blocks[index].width))){
                  value.board.balls[i].dy= -Math.abs(value.board.balls[i].dy);
                }
                else {
                  value.board.balls[i].dx= Math.abs(value.board.balls[i].dx);
                }
              }
              else if ((value.board.blocks[index].posy >= tempball.posy) && (value.board.blocks[index].posy <= tempball.posy + tempball.height)&&
              (value.board.blocks[index].posx >= tempball.posx) && (value.board.blocks[index].posx <= tempball.posx + tempball.width)){
                //top and left
                if((value.board.blocks[index].posx-tempball.posx)==(value.board.blocks[index].posy-tempball.posy)){
                  value.board.balls[i].dx= -Math.abs(value.board.balls[i].dx);
                  value.board.balls[i].dy= -Math.abs(value.board.balls[i].dy);
                }
                else if((value.board.blocks[index].posx-tempball.posx)>(value.board.blocks[index].posy-tempball.posy)){
                  value.board.balls[i].dx= -Math.abs(value.board.balls[i].dx);
                }
                else{
                  value.board.balls[i].dy= -Math.abs(value.board.balls[i].dy);
                }
              }
              else if ((value.board.blocks[index].posy <= tempball.posy) && (value.board.blocks[index].posy+value.board.blocks[index].height >= tempball.posy)&&
              ((value.board.blocks[index].posx+value.board.blocks[index].width) <= (tempball.posx+tempball.width)) && (tempball.posx<=value.board.blocks[index].posx+value.board.blocks[index].width)){
                    //bot and right
                    if((tempball.posx+tempball.width-(value.board.blocks[index].posx+value.board.blocks[index].width))==(tempball.posy+tempball.height-(value.board.blocks[index].posy+value.board.blocks[index].height))){
                      value.board.balls[i].dx= Math.abs(value.board.balls[i].dx);
                      value.board.balls[i].dy= Math.abs(value.board.balls[i].dy);
                    }
                    else if((tempball.posx+tempball.width-(value.board.blocks[index].posx+value.board.blocks[index].width))>(tempball.posy+tempball.height-(value.board.blocks[index].posy+value.board.blocks[index].height))){
                      value.board.balls[i].dx= Math.abs(value.board.balls[i].dx);
                    }
                    else{
                      value.board.balls[i].dy= Math.abs(value.board.balls[i].dy);
                    }
                  }
                  else if ((value.board.blocks[index].posy <= tempball.posy) && (value.board.blocks[index].posy+value.board.blocks[index].height >= tempball.posy)&&
                  (value.board.blocks[index].posx >= tempball.posx) && (value.board.blocks[index].posx <= tempball.posx + tempball.width)){
                    //bot and left
                    if((value.board.blocks[index].posx-tempball.posx)==(tempball.posy+tempball.height-(value.board.blocks[index].posy+value.board.blocks[index].height))){
                      value.board.balls[i].dx= -Math.abs(value.board.balls[i].dx);
                      value.board.balls[i].dy= Math.abs(value.board.balls[i].dy);
                    }
                    else if((value.board.blocks[index].posx-tempball.posx)>(tempball.posy+tempball.height-(value.board.blocks[index].posy+value.board.blocks[index].height))){
                      value.board.balls[i].dx= -Math.abs(value.board.balls[i].dx);
                    }
                    else{
                      value.board.balls[i].dy= Math.abs(value.board.balls[i].dy);
                    }
                  }
                  else if ((value.board.blocks[index].posy > tempball.posy) && (value.board.blocks[index].posy <= tempball.posy + tempball.height)) {
                    // return 'top'; // o1's top border collided with o2's bottom border
                    //tempball collision above block
                    value.board.balls[i].dy=-value.board.balls[i].dy;
                  }
                  //left
                  else if ((value.board.blocks[index].posx > tempball.posx) && (value.board.blocks[index].posx <= tempball.posx + tempball.width)) {
                    value.board.balls[i].dx=-value.board.balls[i].dx;
                  }
                  //bot
                  else if ((value.board.blocks[index].posy < tempball.posy) && (value.board.blocks[index].posy+value.board.blocks[index].height >= tempball.posy)) {
                    //tempball collision below block
                    value.board.balls[i].dy=-value.board.balls[i].dy;
                  }
                  //right
                  else if (((value.board.blocks[index].posx+value.board.blocks[index].width) <= (tempball.posx+tempball.width)) && (tempball.posx<value.board.blocks[index].posx+value.board.blocks[index].width)) {
                    value.board.balls[i].dx=-value.board.balls[i].dx;
                  } 
                }
                
              }
              //removing collided blocks
              for (var index = blockstoremove.length -1; index >= 0; index--){
                value.board.blocks.splice(blockstoremove[index],1);
              }
              ///// end of collision detection 
              if(!onlineusers.get(key).isbot){
                onlineusers.get(key).socket.emit('gameupdate',value);
              }
              if(value.isover){
                if(value.HasWon){
                  if(!onlineusers.get(key).isbot){
                    console.log(onlineusers.get(key).nickname,'won!');
                    addwin(onlineusers.get(key).username);
                  }
                  if(!onlineusers.get(getidbyusername(value.opponent)).isbot){
                    console.log(onlineusers.get(getidbyusername(value.opponent)).nickname,'lost!!');
                    addlose(onlineusers.get(getidbyusername(value.opponent)).username);
                  }
                }
                else{
                  if(!onlineusers.get(key).isbot){
                    console.log(onlineusers.get(key).nickname,'lost!');
                    addlose(onlineusers.get(key).username);
                  }
                  if(!onlineusers.get(getidbyusername(value.opponent)).isbot){
                    console.log(onlineusers.get(getidbyusername(value.opponent)).nickname,'won!!');
                    addwin(onlineusers.get(getidbyusername(value.opponent)).username);
                  }
                }
                console.log('gameover, scores are: player1:',value.board.player1score,' player2:',value.board.player2score);
                if(!onlineusers.get(getidbyusername(value.opponent)).isbot){
                  onlineusers.get(getidbyusername(value.opponent)).socket.emit('gameupdate',activegames.get(getidbyusername(value.opponent)));
                }
                activegames.delete(getidbyusername(value.opponent));
                activegames.delete(key);

                if(onlineusers.get(getidbyusername(value.opponent)).isbot){
                  index = bots.indexOf((getidbyusername(value.opponent)));
                  onlineusers.delete(getidbyusername(value.opponent));
                  if (index > -1) {
                    console.log('removed:',bots.splice(index, 1));
                  }
                }
                else if(onlineusers.get(key).isbot){
                  onlineusers.delete(key);
                  index = bots.indexOf(key);
                  if (index > -1) {
                    console.log('removed:',bots.splice(index, 1));
                  }
                }
                break;
              }
          }
        }
          else{
            if(!onlineusers.get(key).isbot)
              onlineusers.get(key).socket.emit('gameupdate',value);
          }
          })},1000/60);
          server.listen(port, () => console.log(`Listening on port ${port}`))