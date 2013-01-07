var express = require('express'),
    connect   = require('connect'),
    passport  = require('passport'),
    http = require('http'),
    xtend = require('xtend');

var socketIo = require('socket.io'),
    passportSocketIo = require('../../lib');

var sessionStore    = new connect.session.MemoryStore(),
    cookieSecret  = 'asdasdsdas1312312',
    sessionKey    = 'test-session-key';

var server;

require('./setupPassport');

exports.start = function (options, callback) {
  
  if(typeof options == 'function'){
    callback = options;
    options = {};
  }

  var app = express();
  app.configure(function(){
    app.use(express.cookieParser(cookieSecret));
   
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    
    app.use(express.session({
      store: sessionStore,
      key: sessionKey
    }));

    app.use(passport.initialize());
    app.use(passport.session());

  });

  app.post('/login', passport.authenticate('local', { successRedirect: '/',
                                                      failureRedirect: '/login',
                                                      failureFlash: true }));

  app.get('/', function(req, res){
    if(!req.user){
      res.send(401);
    }else{
      res.json(req.user);
    }
  });

  server = http.createServer(app);

  var sio = socketIo.listen(server);
  sio.configure(function(){
    this.set('authorization', passportSocketIo.authorize(xtend({
      sessionKey:    sessionKey,
      sessionStore:  sessionStore,
      sessionSecret: cookieSecret
    }, options)));

    this.set('log level', 0);

  });

  sio.sockets.on('echo', function (m) {
    sio.sockets.emit('echo-response', m);
  });

  server.listen(9000, callback);
};

exports.stop = function (callback) {
  server.close();
  callback();
};