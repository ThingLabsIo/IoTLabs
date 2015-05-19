/* Lab05_servo
 * In this lab you will create a servo device that moves to a random
 * position every two-seconds to demonstrate servo control.
 * 
 * Check out Lab05_Servo.js to see an example of how you could control 
 * the position of things based on the ambient light, such as blinds 
 * on a window.
 *
 * For this lab, wire up a servo with the white lead connected to 
 * digital pin 10 and the red and black leads connected to 5V and 
 * GND respectively.
 */
var five = require("johnny-five");
var board = new five.Board();

board.on("ready", function() {
    console.log("Board connected...");
    
    var servo = new five.Servo({
        pin: 10,
        startAt: 0
    });
    
    // Add servo to REPL (optional)
    this.repl.inject({
        servo: servo
    });
    
    var pos;
    // Loop every two seconds and move the servo to a random
    // position between 0 and 180 (the default range of the servo)
    this.loop(2000, function() {
        pos = Math.floor((Math.random() * 180) + 1);
        
        console.log("position: " + pos);
        
        servo.to(pos);
    });
});