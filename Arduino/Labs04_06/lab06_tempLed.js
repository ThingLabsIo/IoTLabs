/* Lab06_tempLed
 * In this lab you will create an indicator light that subscribes to the 
 * message stream of a temperture sensor (lab04_temp.js). When a message is
 * detected from the temperature sensor the indicator light device will
 * receive it (as a subscriber) and process it, changing state
 * as necessary. The indicator light is an RGB LED that will alter its color 
 * based on the temperature.
 *
 * For this lab, wire up an RGB LED longest pin connected to GND,
 * the next longest connected to digital pin 5, the next one connected to 
 * digital pin 2, and the shortest one connected to digital pin 6.
 *
 * You must use the Nitrogen CLI to set permissions for the Indicator device
 * to subscribe to the Temperature device
 * n2 permission add --action subscribe --issueTo TEMP DEVICE --permissionFor INDICATOR DEVICE --authorized true
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

// Specify a command tag that you can scope to.
// This will enable you to filter to only relevant messages
var cmdTag = 'demo_temp';

board = new five.Board({ port: "COM3" });
config.store = new Store(config);
service = new nitrogen.Service(config);

// Create a new Nitrogen device for the photoresistor
// This device will send data it reads from a sensor
indicatorLight = new nitrogen.Device({
    nickname: 'lab06_tempLed',
    name: 'Lab 06 Temperature Indicator',
    tags: ['sends:_color', 'executes:temperature']
});

// Connect the indicatorLight device defined above
// to the Nitrogen service instance.
service.connect(indicatorLight, function(err, session, indicatorLight) {
    if (err) { return console.log('Failed to connect lab06_tempLed: ' + err); }
    
    // Create an instance of the subclassed CommandManager object for the indicatorLight
    new TempStatusManager(indicatorLight).start(session, function(err, message) { 
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
    });
});

// Create a command manager object and 
// set it's prototype to the generic nitrogen.CommandManager 
function TempStatusManager() {
    nitrogen.CommandManager.apply(this, arguments);
}

TempStatusManager.prototype = Object.create(nitrogen.CommandManager.prototype);
TempStatusManager.prototype.constructor = TempStatusManager;

// Override: CommandManager.isRelevant(message)
// Return true if this message is relevant to the CommandManager
// _color and temperature are the messages the TempIndicator cares about
TempStatusManager.prototype.isRelevant = function(message) {
    return (message.is('_color') || message.is('temperature'));
};

// Override: CommandManager.isCommand(message)
// Return true if this message is a command that this
// CommandManager should process. 
TempStatusManager.prototype.isCommand = function(message) {
    return message.is('temperature')
};

// Override: CommandManager.obsoletes(downstreamMsg, upstreamMsg)
// Returns true if the given message upstream 
// is obsoleted by the downstream message.
TempStatusManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg))
        return true;

    var value = downstreamMsg.is('_color') &&
                downstreamMsg.isResponseTo(upstreamMsg) &&
                upstreamMsg.is('temperature');

    return value;
};

// Override: CommandManager.executeQueue()
// Executes the active commands in the message queue
TempStatusManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('no device attached to control manager.'));

    var self = this;

    // CommandManager.activeCommands()
    // Returns the array of commands that are currently active for this manager
    var activeCommands = this.activeCommands();

    // Verify there are activeCommands
    if (activeCommands.length === 0) {
        this.session.log.warn('TempIndicator::executeQueue: no active commands to execute.');
        return callback();
    }
    
    var commandIds = []; // An array to collect Command IDs
    var color; // Variables for the Red, Green and Blue values

    // Find the final state and collect all the active command ids
    // You will use them in a moment.
    activeCommands.forEach(function(activeCommand) {
        // Collect active command IDs
        commandIds.push(activeCommand.id);
        // Collect the ambient light level from the message
        var temp = activeCommand.body.command.temperature;
        
        if (temp < 30) 
            color = '0000FF';
        else if (temp < 33) 
            color = '00FF00';
        else
            color = 'FF0000';
    });
    
    // If the LED is present, set its color value
    if(led != null) {
        led.color(color);
    }
    
    // This is the response to the temperature command.
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
TempStatusManager.prototype.start = function(session, callback) {

    var filter = {
        tags: nitrogen.CommandManager.commandTag(cmdTag)
    };
    
    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};