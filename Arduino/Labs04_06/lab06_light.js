var five = require ("johnny-five"),
    board,led;
    
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

board = new five.Board({ port: "COM5" });
config.store = new Store(config);
service = new nitrogen.Service(config);

// Create a new Nitrogen device for the photoresistor
// This device will send data it reads from a sensor
indicatorLight = new nitrogen.Device({
    nickname: 'lab06_indicatorLight',
    name: 'Lab 06 Indicator Light',
    tags: ['sends:_lightState', 'executes:_lightLevel']
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
    
        // Define the LED object using the pin
        led = new five.Led(LEDPIN);
   
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
// _lightState and _lightLevel are the messages the LightManager cares about
LightManager.prototype.isRelevant = function(message) {
    console.log("isrelevant");
    var relevant = (message.is('_lightState') || message.is('_lightLevel'));

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
        lightOn = light > 350;
    });
    
    // Turn the light on or off based on final state
    if (led != null) { // Make sure the led sensor is available before using it
        if(lightOn) { 
           led.on();
        } else { 
           led.off();
        }
    }
    else {
        console.log("ERROR: 'led' was null.");
    }
    
    // This is the response to the _lightLevel command.
    // Notice the response_to is the array of command ids from above. This is used in the obsoletes method above as well.
    var lightMessage = new nitrogen.Message({
        type: '_lightState',
        tags: nitrogen.CommandManager.commandTag('lab06'),
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
        
        // let the command manager know we processed this message.
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
        tags: nitrogen.CommandManager.commandTag('lab06')
    };
    
    return nitrogen.CommandManager.prototype.start.call(this, session, filter, callback);
};