var connectUtils = require('connect').utils,
    cookie = require('cookie');

function authorize(options){
  var passport      = options.passport        || require('passport'),
      sessionKey    = options.sessionKey      || 'express.sid',
      sessionSecret = options.sessionSecret,
      sessionStore  = options.sessionStore;

  var userProperty  = passport._userProperty  || 'user';

  return function(data, accept){
    if (!data.headers.cookie) {
      return accept('Session cookie required.', false);
    }

    var parsedCookie = cookie.parse(data.headers.cookie);

    data.cookie = connectUtils.parseSignedCookies(parsedCookie, sessionSecret);

    data.sessionID = data.cookie['express.sid'];

    sessionStore.get(data.sessionID, function(err, session){
      
      if (err) {
        return accept('Error in session store.', false);
      } else if (!session) {
        return accept('Session not found.', false);
      }

      if(!session[passport._key]){
        return accept('passport was not initialized', false);
      }

      var userKey = session[passport._key][userProperty];
      
      if(!userKey){
        return accept('not yet authenticated', false);
      }

      passport.deserializeUser(userKey, function(err, user) {
        data[userProperty] = user;
        return accept(null, true);
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