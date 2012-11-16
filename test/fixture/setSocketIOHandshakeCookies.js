var xmlhttprequest = require('xmlhttprequest');
var originalRequest = xmlhttprequest.XMLHttpRequest;

module.exports = function (jar) {
  xmlhttprequest.XMLHttpRequest = function(){
    originalRequest.apply(this, arguments);
    this.setDisableHeaderCheck(true);
    
    var stdOpen = this.open;

    this.open = function() {
      stdOpen.apply(this, arguments);
      var header = jar.get({ url: 'http://localhost:9000' })
        .map(function (c) {
          return c.name + "=" + c.value;
        }).join("; ");
      this.setRequestHeader('cookie', header);
    };
  };
};