var five = require ("johnny-five"),
    board, photoresistor;
    
var Store = require("nitrogen-file-store"),
    nitrogen = require("nitrogen"),
    service, lightSensor;
    
var config = {
    host: process.env.HOST_NAME || 'api.nitrogen.io',
    http_port: process.env.PORT || 443,
    protocol: process.env.PROTOCOL || 'https',
    api_key: process.env.API_KEY || 'YOUR API KEY HERE'
};

board = new five.Board();
config.store = new Store(config);
service = new nitrogen.Service(config);

lightSensor = new nitrogen.Device({
    nickname: 'lab04_lightSensor',
    name: 'Lab 04 Light Sensor'
});

// Connect the lightSensor device defined above
// to the Nitrogen service instance.
service.connect(lightSensor, function(err, session, lightSensor) {
    if (err) { return console.log('Failed to connect lightSensor: ' + err); }
    
    board.on("ready", function() {
    
        console.log("Board connected...");
        
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
