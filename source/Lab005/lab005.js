/*
  Lab005.js
  In this lab you will use a photoresistor to create an ambient light
  sensor. You will send data collected from the ambient light sensor
  to Nitrogen and process it to determine is the LED should be on or off.
  You will then send a message indicting the state of the LED after the
  command is processed. In this lab you are simulating two devices - an
  ambient light sensor and a light -- with a single Arduino.
*/
var verboseLogging = false;

var five = require ("johnny-five"),
    board, photoresistor,led;
    
var Store = require("nitrogen-file-store"),
    nitrogen = require("nitrogen"),
    service, lightSensor;

var config = {
    host: process.env.HOST_NAME || 'api.nitrogen.io',
    http_port: process.env.PORT || 443,
    protocol: process.env.PROTOCOL || 'https',
    api_key: process.env.API_KEY || '151d6be7ba170d76afcee5e953fe23bd'
};

var LEDPIN = 13;

board = new five.Board();
config.store = new Store(config);
service = new nitrogen.Service(config);

// Create a new Nitrogen device for the photoresistor
// This device will send data it reads from a sensor
lightSensor = new nitrogen.Device({
    nickname: 'lightSensor',
    name: 'Light Sensor',
    tags: ['sends:_lightState', 'executes:_lightLevel']
});

board.on("ready", function() {
    console.log("Board connected...");
    // Create a new `photoresistor` hardware instance.
    photoresistor = new five.Sensor({
        pin: 'A0',  // Analog pin 0
        freq: 1000  // Collect data once per second
    });
    // Define the LED object using the pin
   led = new five.Led(LEDPIN);
    // Inject the `sensor` hardware into the Repl instance's context;
    // Allows direct command line access
    board.repl.inject({
        pot: photoresistor,
        led:led
    });
    // Connect the lightSensor device defined above
    // to the Nitrogen service instance.
    service.connect(lightSensor, function(err, session, lightSensor) {
        if (err) { return console.log('Failed to connect lightSensor: ' + err); }
        // Create a new CommandManager object for the light (on/off)
        new LightManager(lightSensor).start(session, function(err, message) { 
            if (err) return session.log.error(JSON.stringify(err)); 
        });
        // Define the event handler for the photo resistor reading
        // The freq value used when the photoresistor was defined
        // determines how often this is invoked, thus controlling
        // the frequency of Nitrogen messages.
        photoresistor.on('data', function() {
            // Capture the ambient light level from the photo resistor
            var lightLevel = this.value;
            // Create a Nitrogen Message to send the _lightLevel
            var ambientLightMessage = new nitrogen.Message({
                type: '_lightLevel',
                tags: nitrogen.CommandManager.commandTag(lightSensor.id),
                body: {
                    command: {
                        ambientLight: lightLevel
                    }
                },
                to: lightSensor.id
            });
            // Send the message
            ambientLightMessage.send(session);
            
            console.log("Message sent: " + JSON.stringify(ambientLightMessage));
        });
    });
});

// Create a command manager object and 
// set it's prototype to the generic nitrogen.CommandManager 
function LightManager() {
    nitrogen.CommandManager.apply(this, arguments);
}

LightManager.prototype = Object.create(nitrogen.CommandManager.prototype);
LightManager.prototype.constructor = LightManager;

// Override: CommandManager.isRelevant(message)
// Return true if this message is relevant to the CommandManager
// _lightState and _lightLevel are the messages the LightManager cares about
LightManager.prototype.isRelevant = function(message) {
    var relevant = ( (message.is('_lightState') || message.is('_lightLevel')) &&
                     (!this.device || message.from === this.device.id || message.to == this.device.id) );

    return relevant;
};

// Override: CommandManager.isCommand(message)
// Return true if this message is a command that this
// CommandManager should process. 
LightManager.prototype.isCommand = function(message) {
    return message.is('_lightLevel');
};

// Override: CommandManager.obsoletes(downstreamMsg, upstreamMsg)
// Returns true if the given message upstream 
// is obsoleted by the downstream message.
LightManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg))
        return true;

    var value = downstreamMsg.is('_lightState') &&
                downstreamMsg.isResponseTo(upstreamMsg) &&
                upstreamMsg.is('_lightLevel');

    return value;
};

// Override: CommandManager.executeQueue()
// Executes the active commands in the message queue
LightManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('no device attached to control manager.'));
    var self = this;
    // CommandManager.activeCommands()
    // Returns the array of commands that are currently active for this manager
    var activeCommands = this.activeCommands();
    // Verify there are activeCommands
    if (activeCommands.length === 0) {
        this.session.log.warn('LightManager::executeQueue: no active commands to execute.');
        return callback();
    }

    var commandIds = [];
    var lightOn;
    // Find the final state and collect all the active command ids
    // You will use them in a moment.
    activeCommands.forEach(function(activeCommand) {
        // Collect active command IDs
        commandIds.push(activeCommand.id);
        
        var light = activeCommand.body.command.ambientLight;
        
        // Determine the final state of the light (on/true or off/false)
        if (light > 350) {
            lightOn = true;
        } else {
            lightOn = false;
        }
    });
    
    // Turn the light on or off based on final state
    if (led != null) {
        if(lightOn) { 
           led.on();
        } else { 
           led.off();
        }
    }

    // This is the response to the _lightLevel command.
    // Notice the response_to is the array of command ids from above. This is used in the obsoletes method above as well.
    var lightMessage = new nitrogen.Message({
        type: '_lightState',
        tags: nitrogen.CommandManager.commandTag(self.device.id),
        body: {
            command: {
                on: lightOn
            }
        },
        response_to: commandIds
    });

    lightMessage.send(this.session, function(err, message) {
        if (err) return callback(err);
        
        console.log("Message sent: " + JSON.stringify(lightMessage));
        
        // let the command manager know we processed this _lightState message by passing it the _isOn message.
        self.process(new nitrogen.Message(lightMessage));

        // need to callback if there aren't any issues so commandManager can proceed.   
        return callback();
    });
};

// Override: start
// Starts command processing on the message stream using the principal’s session. 
// It fetches all the current messages, processes them, and then starts execution.
// It also establishes a subscription to handle new messages and automatically executes 
// them as they are received.
LightManager.prototype.start = function(session, callback) {

    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
    };

    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};