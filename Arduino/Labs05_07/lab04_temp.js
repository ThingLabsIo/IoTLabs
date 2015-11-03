/* Lab 04 Temperature Input
 * In this lab you will create a sensor that sends temperature telemetry data.
 * 
 * For this lab, wire up a TMP36 temperature sensor with the center pin 
 * connected to Analog Input 2.
 */
var five = require ("johnny-five"),
    board, tmp;
    
var Store = require("nitrogen-file-store"),
    nitrogen = require("nitrogen"),
    service, tempSensor;
    
var config = {
    host: process.env.HOST_NAME || 'api.nitrogen.io',
    http_port: process.env.PORT || 443,
    protocol: process.env.PROTOCOL || 'https',
    api_key: process.env.API_KEY || 'YOUR API KEY HERE'
};

board = new five.Board({ port: "COM5" });
config.store = new Store(config);
service = new nitrogen.Service(config);

tempSensor = new nitrogen.Device({
    nickname: 'lab04_tempSensor',
    name: 'Lab 04 Temperature Sensor'
});

// Connect the tempSensor device defined above
// to the Nitrogen service instance.
service.connect(tempSensor, function(err, session, tempSensor) {
    if (err) { return console.log('Failed to connect tempSensor: ' + err); }
    
    board.on("ready", function() {
        console.log("Board connected...");

        var temperature = new five.Temperature({
            controller: "TMP36",
            pin: "A2",
            freq: 500
        });
    
        // When temperature data is read based on the freq,
        // send a messge to Nitrogen
        temperature.on("data", function(err, data) {

            var c = Math.floor(data.celsius);
      
            // Create a Nitrogen message
            var message = new nitrogen.Message({
                type: 'temperature',
                tags: nitrogen.CommandManager.commandTag('demo_temp'),
                body: {
                    temperature: c
                }
            });
            
            console.log("Message sent: " + JSON.stringify(message));

            // Send the message
            message.send(session);
        });
    });
});