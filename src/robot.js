const i18n = require('i18n');

const Friend = require('./friend.js');
const tts = require('./gcp/text-to-speech.js');
const faceRecognition = require('./aws/rekognition.js');
const assert = require('assert');
const camera = require('./camera/camera.js');
//const speechRecognition = require('./listen/speechRecognition.js')
const dialogflow = require('./listen/dialogflow.js')

function Robot (opts) {
        assert(opts.name);
        this.name = opts.name;

        this.greetFriend = async function (friend) {
            console.log("greet");
            await tts(i18n.__('Hello %s!', friend.name));
            console.log("greet done");
        };

        this.greetStranger = async function (friend) {
            console.log("greet stranger");
            await tts(i18n.__('Hello! My name is %s. What\'s your name?', this.name));
            console.log("greet stranger done");
            await this.listen();
        };

        this.introduceMyself = async function () {
            console.log("intro");
            await tts(i18n.__('My name is %s.', this.name));
            console.log("intro done");
        };

        this.alone = async function () {
            console.log("alone");
            await tts(i18n.__("Hm. There's no one here."));
            console.log("alone done");
        };

        this.wakeUp = function () {
            this.see();
        };

        this.see = function() {
            robot = this;
            camera(function(fileName){
                robot.cameraFileName = fileName;
                robot.faceRecognition();
            });
        };

        this.faceRecognition = function(){
            const robot = this;
            faceRecognition.search(robot.cameraFileName, async function(result){
                console.log("In faceRecognition callback...");
                if ( result.status == "OK" ) {
                    const friend = Friend.create({name: result.name});
                    await robot.greetFriend(friend);
                    await robot.introduceMyself();
                }
                else if (result.status == "UNKNOWN FACE") {
                    await robot.greetStranger();
                }
                else if (result.status == "NO FACE" ) {
                     await robot.alone();
                }
            });
        };

        this.listen = async function () {
            const robot = this;
//             const listenCallback = async function (res) {
//                 console.log("processListen()");
//                 console.log(res);
//                 if ( res.entities['wit$contact:contact'] ) {
//                     console.log(res.entities['wit$contact:contact']);
//                     const friend = Friend.create({name: res.entities['wit$contact:contact'][0].value});
//                     faceRecognition.add(friend, async function() {
//                         await robot.greetFriend(friend);
//                     })
//                 }
//                 else {
//                     await tts(i18n.__("Sorry, I didn't quite catch your name. Can you please try again."));
//                 }
//             };
//            await speechRecognition(listenCallback, (err) => console.log(err));

            const listenCallback = async function (data) {
                //console.log(data);
                if (data.recognitionResult) {
                    console.log(
                        `Intermediate transcript: ${data.recognitionResult.transcript}`
                    );
                } else {
                    console.log('Detected intent:');
                    console.log(JSON.stringify(data));

                    const queryResult = data.queryResult;
                    const name = dialogflow.getNameInResult(queryResult);

                    if (name) {
                        const friend = Friend.create({name: name});
                        faceRecognition.add(friend, async function() {
                            await robot.greetFriend(friend);
                            await tts(i18n.__("Nice to meet you."));
                        })
                    } else {
                        console.log('  Name not found in result.');
                        console.log(data);
                        await tts(i18n.__("Sorry, I didn't quite catch your name. Can you please try again."));
                    }
                }
            };

            await dialogflow.start(listenCallback, (err) => console.log(err));
            console.log("Started listen()ing. I'm done. Callback will handle things after you finish talking.");
        };


        return this;
}

module.exports.create = function(opts) {
    return new Robot(opts);
};
