/*
Particle Photon 'Hello World' with Node.js and Johnny-Five
By: Doug Seven
License: MIT

This example is based on the documentation for the Particle-IO
plug-in for Johnny Five by Rick Waldron <waldron.rick@gmail.com>.
See https://github.com/rwaldron/spark-io for the complete
documentation. 
*/
var five = require ("johnny-five"); 
var Particle = require("particle-io");
// Set up the access credentials for Particle and Azure 
var token = process.env.PARTICLE_KEY || 'YOUR PARTICLE ACCESS TOKEN HERE'; 
var deviceId = process.env.PHOTON_ID || 'YOUR PARTICLE PHOTON DEVICE ID/ALIAS HERE'; 
// Define the pin that is connected to the LED 
var LEDPIN = 'D7';
// Create a Johnny Five board instance to represent your Particle Photon.
// Board is simply an abstraction of the physical hardware, whether it is 
// a Photon, Arduino, Raspberry Pi or other boards. 
var board = new five.Board({ 
	io: new Particle({ 
		token: token, 
		deviceId: deviceId 
	}) 
});

// The board.on() executes the anonymous function when the
// board reports back that it is initialized and ready. 
board.on("ready", function() { 
	console.log("Board connected..."); 
	// Set the pin you connected to the LED to OUTPUT mode  
	this.pinMode(LEDPIN, five.Pin.OUTPUT); 

	// Create a loop to "flash/blink/strobe" an led  
	var val = 0;  this.loop( 1000, function() {
		this.digitalWrite(LEDPIN, (val = val ? 0 : 1));
	});
});
