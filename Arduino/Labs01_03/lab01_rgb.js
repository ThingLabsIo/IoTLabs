/* Lab 01 LED RGB Output
 * In this lab you will randomly change the color of an RGB LED..
 * 
 *
 * For this lab, wire up an RGB LED longest pin connected to GND,
 * the next longest connected to digital pin 5, the next one connected to 
 * digital pin 2, and the shortest one connected to digital pin 6.
 */
 var five = require("johnny-five");
var board = new five.Board({ port: "COM5" });
var r, g, b;

board.on("ready", function() {
    console.log("Board connected...");

    // Initialize the RGB LED
    var led = new five.Led.RGB({
        pins: {
            red: 6,
            green: 5,
            blue: 3
        }
    });
    
    // Add led to REPL (optional)
    this.repl.inject({
        led: led
    });

    // Turn on the LED
    led.on();
  
    // Loop every half-second changing the LED to a random RBG color
    this.loop(500, function() {
        r = Math.floor((Math.random() * 255) + 1).toString(16);
        g = Math.floor((Math.random() * 255) + 1).toString(16);
        b = Math.floor((Math.random() * 255) + 1).toString(16);
        
        // Add a leading '0' as needed.
        if(r.length < 2) r = '0' + r;
        if(g.length < 2) g = '0' + g;
        if(b.length < 2) b = '0' + b;
        
        console.log(r, g, b);
    
        led.color(r + g + b);
    });
});
