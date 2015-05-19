var five = require("johnny-five");
var board = new five.Board();
var ANALOGPIN = 0;

board.on("ready", function() {
    
    // read the input on analog pin 0:
    this.analogRead(ANALOGPIN, function(voltage) {
      console.log(voltage * (5.0 / 1024.0));
    });

});