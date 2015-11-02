/*
Particle Photon 'COnnected Ambient Light' with Node.js and Johnny-Five
By: Doug Seven
License: MIT

This example uses Nitrogen, an open source IoT service.
Read more about Nitrogen at http://nitrogen.io 
*/

// Define the Johnny Five and Particle-IO variables
var five = require("johnny-five"),
    board, photoresistor;
var particle = require("particle-io");
var Store = require("nitrogen-file-store"),
    nitrogen = require("nitrogen"),
    service, lightSensor;
    
var config = {
    host: process.env.HOST_NAME || 'api.nitrogen.io',
    http_port: process.env.PORT || 443,
    protocol: process.env.PROTOCOL || 'https',
    api_key: process.env.NITROGEN_KEY || 'YOUR API KEY HERE'
};

config.store = new Store(config);
service = new nitrogen.Service(config);

// Create a new Nitrogen device for the photoresistor
// This device will send data it reads from a sensor
lightSensor = new nitrogen.Device({
    nickname: process.env.PARTICLE_DEVICE + '-lab04_lightSensor',
    name: process.env.PARTICLE_DEVICE + '-Lab 04 Light Sensor'
});
    
// Define the Johnny Five board as your Particle Photon
board = new five.Board({
  io: new particle({
    token: process.env.PARTICLE_KEY || 'YOUR API KEY HERE',
    deviceId: process.env.PARTICLE_DEVICE || 'YOUR DEVICE ID OR ALIAS HERE'
  })
});


    // The board.on() executes the anonymous function when the 
    // Partile Photon reports back that it is initialized and ready.
    board.on("ready", function(){
      console.log("Board connected...");

// Connect the lightSensor device defined above
// to the Nitrogen service instance.
service.connect(lightSensor, function(err, session, lightSensor) {
    if (err) { return console.log('Failed to connect lightSensor: ' + err); }
            
        // Create a new 'photoresistor' hardware instance.
        photoresistor = new five.Sensor({
            pin: "A0",  // Analog pin 0
            freq: 1000  // Collect data once per second
        });
    
        // Inject the 'sensor' hardware into the Repl instance's context;
        // Allows direct command line access
        board.repl.inject({
            pot: photoresistor
        });

        // Define the callback function for the photoresistor reading
        // The freq value used when the photoresistor was defined
        // determines how often this is invoked, thus controlling
        // the frequency of Nitrogen messages.
        photoresistor.on('data', function() {
            // Capture the ambient light level from the photoresistor
            var lightLevel = this.value;

            // Create a Nitrogen message
            var message = new nitrogen.Message({
                type: '_lightLevel',
                body: {
                    ambientLight: lightLevel
                }
            });
            
            // Log the light level value for debugging    
            session.log.info('Sending ambientLight: ' + lightLevel);

            // Send the message
            message.send(session);
        });
    });
});