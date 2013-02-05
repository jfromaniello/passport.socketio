var fixture = require('./fixture'),
  request = require('request'),
  setSocketIOHandshakeCookies = require('./fixture/setSocketIOHandshakeCookies');

var io = require('socket.io-client');

describe('authorizer with success callback', function () {

  //stop the server
  afterEach(fixture.stop);

  //start the server 
  //create a new session for every test
  beforeEach(function(done){
    this.cookies = request.jar();
    setSocketIOHandshakeCookies(this.cookies);

    fixture.start({
      success: function(data, accept){
        this.accept = accept;
      }.bind(this)
    }, done);

  });


  it('should call the success function with accept', function (done){
    request.post({
      jar: this.cookies,
      url: 'http://localhost:9000/login',
      form: {username: 'jose', password: 'Pa123'}
    }, function(){

      io.connect('http://localhost:9000', {'force new connection':true});
      setTimeout(function(){

        this.accept
          .should.be.instanceOf(Function);
        
        done();

      }.bind(this), 300);
    
    }.bind(this));
  });


  it('should not connect until calling the accept function', function (done){
    request.post({
      jar: this.cookies,
      url: 'http://localhost:9000/login',
      form: {username: 'jose', password: 'Pa123'}
    }, function(){

      var connected = false,
          socket = io.connect('http://localhost:9000', {'force new connection':true});

      socket.on('connect', function(){
        connected = true;
      }).on('error', done);

      setTimeout(function(){
        connected.should.be.false;
        done();
      }.bind(this), 300);
    
    }.bind(this));
  });

  it('should connect after calling the accept function', function (done){
    request.post({
      jar: this.cookies,
      url: 'http://localhost:9000/login',
      form: {username: 'jose', password: 'Pa123'}
    }, function(){

      var connected = false,
          socket = io.connect('http://localhost:9000', {'force new connection':true});

      socket.on('connect', function(){
        connected = true;
      }).on('error', done);


      setTimeout(function(){
        this.accept(null, true);

        setTimeout(function(){
          connected.should.be.true;
          done();
        }, 200);

      }.bind(this), 200);
    
    }.bind(this));
  });
});