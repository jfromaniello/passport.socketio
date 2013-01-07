var connectUtils = require('connect').utils,
    cookie = require('cookie'),
    xtend = require('xtend');

function authorize(options) {
  var auth = {
    passport: require('passport'),
    sessionKey: 'express.sid',
    sessionSecret: null,
    sessionStore: null,
    success: null,
    fail: null
  };

  xtend( auth, options );

  auth.userProperty = auth.passport._userProperty || 'user';

  return function(data, accept){
    if (!data.headers.cookie) {
      return accept(null, false);
    }

    var parsedCookie = cookie.parse(data.headers.cookie);

    data.cookie = connectUtils.parseSignedCookies(parsedCookie, auth.sessionSecret);

    data.sessionID = data.cookie[ auth.sessionKey ];

    auth.sessionStore.get(data.sessionID, function(err, session){
      if (err) {
        return accept('Error in session store.', false);
      } else if (!session) {
        return accept(null, false);
      }

      if( !session[ auth.passport._key ] ){
        return accept('passport was not initialized', false);
      }

      var userKey = session[ auth.passport._key ][ auth.userProperty ];

      if( !userKey && auth.fail ) {
        return auth.fail( data, accept );
      } else if( !userKey ) {
        return accept(null, false);
      }

      if( auth.success ) {
        auth.passport.deserializeUser(userKey, function(err, user) {
          data[ auth.userProperty ] = user;
          return auth.success( data, accept );
        });
      }
      auth.passport.deserializeUser(userKey, function(err, user) {
        data[ auth.userProperty ] = user;
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
