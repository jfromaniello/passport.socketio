var xtend = require('xtend');

function parseCookie(auth, cookieHeader) {
  var cookieParser = auth.cookieParser(auth.secret);
  var req = {
    headers:{
      cookie: cookieHeader
    }
  };
  var result;
  cookieParser(req, {}, function (err) {
    if (err) throw err;
    result = req.signedCookies || req.cookies;
  });
  return result;
}

function authorize(options) {
  var defaults = {
    passport:     require('passport'),
    key:          'connect.sid',
    secret:       null,
    store:        null,
    success:      function (data, accept){
      if (data.socketio_version_1) {
        accept();
      } else {
        accept(null, true)
      }
    },
    fail:         function (data, message, critical, accept) {
      if (data.socketio_version_1) {
        accept(new Error(message));
      } else {
        accept(null, false)
      }
    }
  };

  var auth = xtend(defaults, options);

  auth.userProperty = auth.passport._userProperty || 'user';

  if (!auth.cookieParser) {
    throw new Error('cookieParser is required use connect.cookieParser or express.cookieParser');
  }

  return function(data, accept){ 

    // socket.io v1.0 now provides socket handshake data via `socket.request`
    if (data.request) {
      data = data.request;
      data.socketio_version_1 = true;
    }

    data.cookie = parseCookie(auth, data.headers.cookie || '');
    data.sessionID = (data.query && data.query.session_id) || (data._query && data._query.session_id) || data.cookie[auth.key] || '';
    data[auth.userProperty] = {
      logged_in: false
    };

    if(data.xdomain && !data.sessionID)
      return auth.fail(data, 'Can not read cookies from CORS-Requests. See CORS-Workaround in the readme.', false, accept);

    auth.store.get(data.sessionID, function(err, session){
      if(err)
        return auth.fail(data, 'Error in session store:\n' + err.message, true, accept);
      if(!session)
        return auth.fail(data, 'No session found', false, accept);
      if(!session[auth.passport._key])
        return auth.fail(data, 'Passport was not initialized', true, accept);
      
      var userKey = session[auth.passport._key][auth.userProperty];

      if(!userKey)
        return auth.fail(data, 'User not authorized through passport. (User Property not found)', false, accept);

      auth.passport.deserializeUser(userKey, function(err, user) {
        if (err)
          return auth.fail(data, err, true, accept);
        if (!user)
          return auth.fail(data, "User not found", false, accept);
        data[auth.userProperty] = user;
        data[auth.userProperty].logged_in = true;
        auth.success(data, accept);
      });

    });
  };
}

function filterSocketsByUser(socketIo, filter){
  var handshaken = socketIo.sockets.manager.handshaken;
  return Object.keys(handshaken || {})
    .filter(function(skey){
      return filter(handshaken[skey].user);
    })
    .map(function(skey){
      return socketIo.sockets.manager.sockets.sockets[skey];
    });
}

exports.authorize = authorize;
exports.filterSocketsByUser = filterSocketsByUser;
