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
var cmdTag = 'lab06';

board = new five.Board({ port: "COM5" });
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
// _lightState and _lightLevel are the messages the LightManager cares about
LightManager.prototype.isRelevant = function(message) {
    var relevant = (message.is('_color') || message.is('_lightLevel'));
    
    //console.log(message.id + " isrelevant: " + relevant);
    
    return relevant;
};

// Override: CommandManager.isCommand(message)
// Return true if this message is a command that this
// CommandManager should process. 
LightManager.prototype.isCommand = function(message) {
    var cmd = message.is('_lightLevel')
    //console.log("\t" + message.id + " isCommand: " + cmd);
    return cmd;
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

    //console.log("\t\t" + upstreamMsg.id + " obsoletes: " + value);
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
    var r, g, b;

    // Find the final state and collect all the active command ids
    // You will use them in a moment.
    activeCommands.forEach(function(activeCommand) {
        // Collect active command IDs
        commandIds.push(activeCommand.id);
        
        var light = activeCommand.body.command.ambientLight;

        r = map(light, 0, 612, 0, 255);
        g = map(light, 300, 900, 0, 255);
        b = map(light, 612, 1023, 0, 255);        
        
        r = constrain(r, 0, 255).toString(16);
        g = constrain(g, 0, 255).toString(16);
        b = constrain(b, 0, 255).toString(16);
        
         // Add a leading '0' as needed.
        if(r.length < 2) r = '0' + r;
        if(g.length < 2) g = '0' + g;
        if(b.length < 2) b = '0' + b;
        
        //console.log(r, g, b);
        //console.log(r + g + b);
    });
    
    if(led != null) {
        led.color(r + g + b);
    }
    
    // This is the response to the _lightLevel command.
    // Notice the response_to is the array of command ids from above. This is used in the obsoletes method above as well.
    var lightMessage = new nitrogen.Message({
        type: '_color',
        tags: nitrogen.CommandManager.commandTag(cmdTag),
        body: {
            command: {
                color: r + g + b
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