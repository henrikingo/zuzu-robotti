const i18n = require('i18n');

const Friend = require('./friend.js');
const tts = require('./gcp/text-to-speech.js');
const play = require('./play/play');
const Rekognition = require('./aws/rekognition.js');
const assert = require('assert');
const camera = require('./camera/camera.js');
const dialogflow = require('./dialogflow/engine.js');
const memory = require('./memory/astraMemory.js');
//const memory = require('./memory/memory.js');

const MAIN_LOOP = 100; // milliseconds
const OCCASIONALLY = 10*1000; // milliseconds

function DialogFlowRobot (opts) {
        assert(opts.name);
        this.name = opts.name;
        this.dialogflow = dialogflow.create(this, opts.config);
        this.rekognition = Rekognition.create({config: opts.config});
        this.memory = memory.create(this, opts.config);
        const robot = this;

        this.wakeUp = function () {
            console.log("Robot wake up. Open your eyes, look around.");
            occasionally(robot.see, "default", function() {
                // Use setTimeout to get out of callback hell before mainLoop
                setTimeout(robot.mainLoop, 1);
            });
//             this.see(function() {
//                 // Use setTimeout to get out of callback hell before mainLoop
//                 setTimeout(robot.mainLoop, 1);
//             });
        };

        this.mainLoop = function () {
//            console.log("Top of main loop.");
            robot.reallySayThings();
            robot.listen();
            occasionally(robot.see);
            occasionally(robot.memory.dump, "dumpMemory");
//            console.log("End of main loop.");
            setTimeout(robot.mainLoop, 100);
        };

        this.see = function(callback) {
            camera(function(fileName){
                robot.cameraFileName = fileName;
                robot.faceRecognition(callback);
            });
        };

        this._listening = false;
        this._speaking = false;
        this._alone = true;
        this.busy = function() {
            return this.dialogflow.listenProgress > 0 || this._speaking;
        };
        this.idle = function() {
            return ! this.busy();
        };

        this.listen = function() {
            // console.log( "" + !robot._listening + " " + !robot._speaking + " " + !robot._sayQueue.length + " " + !robot._alone);
            if ( !robot._listening && !robot._speaking && !robot._sayQueue.length && !robot._alone) {
                console.log("Opening new stream to DialogFlow. You can speak anything you want.");
                robot._listening = true;
                robot.dialogflow.streamIntent(null, function () {
                    robot._listening = false;
                    console.log("Closed stream to DialogFlow.");
                });
            }
            else {
//                 console.log("Need to wait before listening, some other thread still speaking.");
            }
        };

        this._sayQueue = [];
        this.say = function (text) {
            this._sayQueue.push({"text": text, "type": "text"});
        };
        this.play = function (audio) {
            this._sayQueue.push({"audio": audio, "type": "audio"});
        };

        this.reallySayThings = function() {
            if ( this.idle() ) {
                if (this._sayQueue.length) {
                    this.dialogflow.interrupt();
                    const whatToSay = this._sayQueue.shift();
                    if (whatToSay && whatToSay.type == "text") {
                        console.log("Play text: " + whatToSay.text);
                        this._speaking = true;
                        tts(whatToSay.text, opts.config.gcp.tts_options, function() {
                            robot._speaking = false;
                        });
                    }
                    else if (whatToSay && whatToSay.type == "audio" ) {
                        console.log("Play audio buffer.");
                        this._speaking = true;
                        play(whatToSay.audio, function () {
                            console.log("Play audio callback");
                            robot._speaking = false;
                        });
                    }
                }
            }
            else {
//                 console.log("Need to wait to say next thing, some other thread is still saying or listening.");
            }
        };

        this.faceRecognition = function(callback){
            this.rekognition.search(robot.cameraFileName, async function(result){
                console.log("In faceRecognition callback...");
                // This plays the first prompt uttered by the robot
                if ( result.status == "OK" ) {
                    if ( !robot.friend || robot.friend.name != result.name) {
                        // During this.wakeUp(), this is the expected path: recognize a face you know and greet them.
                        // Later, during this.mainLoop(), this is the rare case when someone went away and a different face is recognized.
                        robot.friend = Friend.create({name: result.name});
                        robot._alone = false;
                        robot.memory.addEvent({type:"friend", name: result.name, friend: robot.friend, time: new Date()});
                        robot.dialogflow.deleteContext("friend");
                        const friendContext = robot.dialogflow.addContext("friend", robot.dialogflow.formatCustomName(result.name));
                        await robot.dialogflow.event("friend", friendContext.parameters);
                    }
                }
                else if (result.status == "UNKNOWN FACE") {
                    robot.friend = null;
                    robot._alone = false;
                    robot.dialogflow.deleteContext("friend");
                    await robot.dialogflow.addContext("stranger");
                    await robot.dialogflow.event("stranger");
                }
                else if (result.status == "NO FACE" ) {
                    if ( robot.friend ) {
                        // Data payload is the Friend that just disappeared
                        robot.memory.addEvent({type:"alone", name: robot.friend.name, friend: robot.friend, time: new Date()});
                        robot.friend = null;
                        robot._alone = true;
                        robot.dialogflow.deleteContext("friend");
                        await robot.dialogflow.event("noface");
                    }
                }
                if ( typeof callback === "function" ) callback();
                console.log("...end of faceRecognition callback.");
            });
        };

        // Save new face in Rekognition service
        this.addFriend = function (friend) {
            robot.rekognition.add(friend);
            robot.friend = friend;
            robot.memory.addEvent({type:"newFriend", name: friend.name, friend: robot.friend, time: new Date()});
        };

        return this;
}

let ticks = {};
const occasionally = function(callback, key, callbackParams) {
    key = key ? key : "default";
    let now = new Date();
    // By design the first call is true
    if ( !ticks[key] ) ticks[key] = now - OCCASIONALLY - 1;

    if ( now - ticks[key] > OCCASIONALLY) {
        ticks[key] = now;
        callback(callbackParams);
        return true;
    }
    return false;
};

module.exports.create = function(opts) {
    return new DialogFlowRobot(opts);
};
