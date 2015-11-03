/* Lab05_servo
 * In this lab you will create a servo device that responds to ambient light.
 * As the ambient light changes, the servo position changes as well.
 * 
 * This is an example of how you could control the position of things
 * based on the ambient light, such as blinds on a window.
 *
 * Wire up an ambient light sensor like the one in Lab 04.
 * Add a servo with the white lead connected to Digital Pin 10
 * and the red and black leads connected to 5V and GND respectively.
 */
var five = require ("johnny-five"),
    board, photoresistor,servo;
    
var Store = require("nitrogen-file-store"),
    nitrogen = require("nitrogen"),
    service, servoDevice;

var config = {
    host: process.env.HOST_NAME || 'api.nitrogen.io',
    http_port: process.env.PORT || 443,
    protocol: process.env.PROTOCOL || 'https',
    api_key: process.env.API_KEY || 'YOUR API KEY HERE'
};

board = new five.Board();
config.store = new Store(config);
service = new nitrogen.Service(config);

// Create a new Nitrogen device for the photoresistor
// This device will send data it reads from a sensor
servoDevice = new nitrogen.Device({
    nickname: 'lab02_servoDevice',
    name: 'Lab 02 Servo Device',
    tags: ['sends:_position', 'executes:_setPosition']
});

// Connect the servoDevice device defined above
// to the Nitrogen service instance.
service.connect(servoDevice, function(err, session, servoDevice) {
    if (err) { return console.log('Failed to connect servoDevice: ' + err); }
    
    // Create an instance of the subclassed CommandManager object for the servoDevice
    new ServoManager(servoDevice).start(session, function(err, message) { 
        if (err) return session.log.error(JSON.stringify(err)); 
    });
    
    board.on("ready", function() {
        console.log("Board connected...");
    
        servo = new five.Servo({
            pin: 10 
        });
        
        // Create a new `photoresistor` hardware instance.
        photoresistor = new five.Sensor({
            pin: 'A0',  // Analog pin 0
            freq: 1000  // Collect data once per second
        });
   
        // Inject the `sensor` hardware into the Repl instance's context;
        // Allows direct command line access
        board.repl.inject({
            pot: photoresistor,
            servo: servo
        });
        
        // Define the event handler for the photo resistor reading
        // The freq value used when the photoresistor was defined
        // determines how often this is invoked, thus controlling
        // the frequency of Nitrogen messages.
        photoresistor.on('data', function() {
            // Capture the ambient light level from the photo resistor
            var lightLevel = this.value;
            var pos = map(lightLevel, 0, 1023, 0, 180);
            pos = constrain(pos, 0, 180);
            
            // Create a Nitrogen Message to send the _lightLevel
            var ambientLightMessage = new nitrogen.Message({
                type: '_setPosition',
                tags: nitrogen.CommandManager.commandTag(servoDevice.id),
                body: {
                    command: {
                        position: pos
                    }
                },
                to: servoDevice.id
            });
            
            // Send the message
            ambientLightMessage.send(session);
            
            console.log("Message sent: " + JSON.stringify(ambientLightMessage));
        });
    });
});

// Create a command manager object and 
// set it's prototype to the generic nitrogen.CommandManager 
function ServoManager() {
    nitrogen.CommandManager.apply(this, arguments);
}

ServoManager.prototype = Object.create(nitrogen.CommandManager.prototype);
ServoManager.prototype.constructor = ServoManager;

// Override: CommandManager.isRelevant(message)
// Return true if this message is relevant to the CommandManager
// _lightState and _lightLevel are the messages the LightManager cares about
ServoManager.prototype.isRelevant = function(message) {
    var relevant = ( (message.is('_position') || message.is('_setPosition')) &&
                     (!this.device || message.from === this.device.id || message.to == this.device.id) );

    return relevant;
};

// Override: CommandManager.isCommand(message)
// Return true if this message is a command that this
// CommandManager should process. 
ServoManager.prototype.isCommand = function(message) {
    return message.is('_setPosition');
};

// Override: CommandManager.obsoletes(downstreamMsg, upstreamMsg)
// Returns true if the given message upstream 
// is obsoleted by the downstream message.
ServoManager.prototype.obsoletes = function(downstreamMsg, upstreamMsg) {
    if (nitrogen.CommandManager.obsoletes(downstreamMsg, upstreamMsg))
        return true;

    var value = downstreamMsg.is('_position') &&
                downstreamMsg.isResponseTo(upstreamMsg) &&
                upstreamMsg.is('_setPosition');

    return value;
};

// Override: CommandManager.executeQueue()
// Executes the active commands in the message queue
ServoManager.prototype.executeQueue = function(callback) {
    if (!this.device) return callback(new Error('no device attached to control manager.'));

    var self = this;

    // CommandManager.activeCommands()
    // Returns the array of commands that are currently active for this manager
    var activeCommands = this.activeCommands();

    // Verify there are activeCommands
    if (activeCommands.length === 0) {
        this.session.log.warn('ServoManager::executeQueue: no active commands to execute.');
        return callback();
    }
    
    var commandIds = [];
    var pos;
    
    //console.log('activeCommands:'); console.dir(activeCommands);

    // Find the final state and collect all the active command ids
    // You will use them in a moment.
    activeCommands.forEach(function(activeCommand) {
        // Collect active command IDs
        commandIds.push(activeCommand.id);
        
        pos = activeCommand.body.command.position;
    });
    
    if(pos > 180) pos = 180;
    else if(pos < 0) pos = 0;
        
    servo.to(pos);
    
    // This is the response to the _lightLevel command.
    // Notice the response_to is the array of command ids from above. This is used in the obsoletes method above as well.
    var servoMessage = new nitrogen.Message({
        type: '_position',
        tags: nitrogen.CommandManager.commandTag(self.device.id),
        body: {
            command: {
                position: pos
            }
        },
        response_to: commandIds
    });
    
    servoMessage.send(this.session, function(err, message) {
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
ServoManager.prototype.start = function(session, callback) {

    var filter = {
        tags: nitrogen.CommandManager.commandTag(this.device.id)
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