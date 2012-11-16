var fixture = require('./fixture'),
  request = require('request'),
  setSocketIOHandshakeCookies = require('./fixture/setSocketIOHandshakeCookies');

var io = require('socket.io-client');

describe('authorizer', function () {

  //start and stop the server 
  before(fixture.start);
  after(fixture.stop);

  //create a new session for every test
  beforeEach(function(){
    this.cookies = request.jar();
    setSocketIOHandshakeCookies(this.cookies);
  });

  
  describe('when the user is not logged in', function () {
    
    it('should emit error with unauthorized handshake', function (done){
      var socket = io.connect('http://localhost:9000', {'force new connection':true});
      socket.on('error', function(err){
        err.should.eql('handshake unauthorized');
        done();
      });
    });

  });

  describe('when the user is logged in', function() {

    beforeEach(function (done) {
      request.post({
        jar: this.cookies,
        url: 'http://localhost:9000/login',
        form: {username: 'jose', password: 'Pa123'}
      }, done);
    });

    it('should do the handshake and connect', function (done){
      var socket = io.connect('http://localhost:9000');
      socket.on('connect', function(){
        done();
      }).on('error', done);
    });

  });
  
});