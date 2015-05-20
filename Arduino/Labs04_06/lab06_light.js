/* Lab06_light
 * In this lab you will create an indicator light that subscribes to the 
 * message stream of an ambient light sensor (lab06_lightSensor.js). When 
 * a message is detected from the ambient light sensor the indicator light
 * device will receive it (as a subscriber) and process it, changing state
 * as necessary. The indicator light is an RGB LED that will alter its color 
 * based on the amount of ambient light.
 *
 * For this lab, wire up an RGB LED longest pin connected to GND,
 * the next longest connected to digital pin 5, the next one connected to 
 * digital pin 2, and the shortest one connected to digital pin 6.
 */
var five = require ("johnny-five"),
    board, led;
    
var Store = require("nitrogen-file-store"),
    nitrogen = require("nitrogen"),
    service, indicatorLight;

var config = {
    host: process.env.HOST_NAME || 'api.nitrogen.io',
    http_port: process.env.PORT || 443,
    protocol: process.env.PROTOCOL || 'https',
    api_key: process.env.API_KEY || 'YOUR API KEY HERE'
};

var LEDPIN = 13;
// Specify a command tag that you can scope to.
// This will enable you to filter to only relevant messages
var cmdTag = 'lab06';

board = new five.Board();
config.store = new Store(config);
service = new nitrogen.Service(config);

// Create a new Nitrogen device for the photoresistor
// This device will send data it reads from a sensor
indicatorLight = new nitrogen.Device({
    nickname: 'lab06_indicatorLight',
    name: 'Lab 06 Indicator Light',
    tags: ['sends:_color', 'executes:_lightLevel']
});

// Connect the indicatorLight device defined above
// to the Nitrogen service instance.
service.connect(indicatorLight, function(err, session, indicatorLight) {
    if (err) { return console.log('Failed to connect lab06_indicatorLight: ' + err); }
    
    // Create an instance of the subclassed CommandManager object for the indicatorLight
    new LightManager(indicatorLight).start(session, function(err, message) { 
        if (err) return session.log.error(JSON.stringify(err)); 
    });
        
    board.on("ready", function() {
        console.log("Board connected...");
           
        // Initialize the RGB LED
        led = new five.Led.RGB({
            pins: {
                red: 6,
                green: 5,
                blue: 3
            }
        });
   
        // Inject the `sensor` hardware into the Repl instance's context;
        // Allows direct command line access
        board.repl.inject({
            led:led
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
// _color and _lightLevel are the messages the LightManager cares about
LightManager.prototype.isRelevant = function(message) {
    return (message.is('_color') || message.is('_lightLevel'));
};

// Override: CommandManager.isCommand(message)
// Return true if this message is a command that this
// CommandManager should process. 
LightManager.prototype.isCommand = function(message) {
    return message.is('_lightLevel')
};

// Override: CommandManager.obsoletes(downstreamMsg, upstreamMsg)
// Returns true if the given message upstream 
// is obsoleted by the downstream message.
LightManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg))
        return true;

    var value = downstreamMsg.is('_color') &&
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
    
    var commandIds = []; // An array to collect Command IDs
    var r, g, b, color; // Variables for the Red, Green and Blue values

    // Find the final state and collect all the active command ids
    // You will use them in a moment.
    activeCommands.forEach(function(activeCommand) {
        // Collect active command IDs
        commandIds.push(activeCommand.id);
        // Collect the ambient light level from the message
        var light = activeCommand.body.command.ambientLight;

        // Set the Red, Green, and Blue values based on the ambient light level.
        // In bright light it will glow green, and in dim light it will glow white.
        // Increase the Red value for levels above 350
        r = map(light, 350, 1023, 0, 255);
        // increase the Green value for all light levels
        g = map(light, 0, 1023, 0, 255);
        // Increase the Blue value for light levels above 650
        b = map(light, 650, 1023, 0, 255);
        
        // Constrain the values to eliminate negative values and values beyond the upper bound
        r = constrain(r, 0, 255).toString(16); //.toString(16) converts the value to Hexidecimal
        g = constrain(g, 0, 255).toString(16);
        b = constrain(b, 0, 255).toString(16);
        
        // Add a leading '0' as needed to have a two-digit hex value
        if(r.length < 2) r = '0' + r;
        if(g.length < 2) g = '0' + g;
        if(b.length < 2) b = '0' + b;
    });
    
    color = r + g + b;
    
    // If the LED is present, set its color value
    if(led != null) {
        led.color(color);
    }
    
    // This is the response to the _lightLevel command.
    // Notice the response_to is the array of command ids from above. This is used in the obsoletes method above as well.
    var lightMessage = new nitrogen.Message({
        type: '_color',
        tags: nitrogen.CommandManager.commandTag(cmdTag),
        body: {
            command: {
                color: color
            }
        },
        response_to: commandIds
    });
    
    lightMessage.send(this.session, function(err, message) {
        if (err) return callback(err);
        
        console.log("Message sent: " + JSON.stringify(message));
        
        // let the command manager know we processed this message.
        self.process(new nitrogen.Message(message));

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
        tags: nitrogen.CommandManager.commandTag(cmdTag)
    };
    
    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};

// This function maps a value from one range into another range
// Example: map (25, 0, 25, 0, 50) returns 50
// Example: map (20, 0, 100, 0, 10) returns 2
function map(x, in_min, in_max, out_min, out_max) {
  return Math.round((x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min);
}

// This function ensures a value is within a defined range
function constrain(x, in_min, in_max) {
  return Math.round(x < in_min ? in_min : x > in_max ? in_max : x);
}
