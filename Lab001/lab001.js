var five = require("johnny-five");
var board = new five.Board();
var LEDPIN = 13;

board.on("ready", function(){
  
  // Set pin 13 to OUTPUT mode
  this.pinMode(LEDPIN, five.Pin.OUTPUT);
  
  // Create a loop to "flash/blink/strobe" an led
  var val = 0;
  
  this.loop( 1000, function() {
    this.digitalWrite(LEDPIN, (val = val ? 0 : 1));
  });
  
});