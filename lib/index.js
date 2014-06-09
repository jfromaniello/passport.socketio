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
    result = req.signedCookies;
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
      if (data.request) {
        accept();
      } else {
        accept(null, true)
      }
    },
    fail:         function (data, message, critical, accept) {
      if (data.request) {
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
    var cookieHeader = (data.request ? data.request.headers.cookie : data.headers.cookie) || ''

    data.cookie = parseCookie(auth, cookieHeader);
    data.sessionID = (data.query && data.query.session_id) || data.cookie[auth.key] || '';
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
  var handshaken = [];
  for ( var i in socketIo.sockets.connected )
    if ( socketIo.sockets.connected[i].handshake )
        handshaken.push( socketIo.sockets.connected[i] )

  return Object.keys(handshaken || {})
    .filter(function(skey){
      return filter(handshaken[skey].user);
    })
    .map(function(skey){
      return handshaken[skey];
    });
}

exports.authorize = authorize;
exports.filterSocketsByUser = filterSocketsByUser;
