const assert = require('assert');
const AudioRecorder = require('node-audiorecorder');
const util = require('util');
const {Transform, pipeline} = require('stream');
const DialogFlowActions = require('./actions');

const pump = util.promisify(pipeline);
// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');


///// DialogFlow

function DialogFlowEngine (robot, config) {
    this.dfActions = DialogFlowActions(robot);
    this.sessionClient = new dialogflow.SessionsClient();
    this.sessionId = Math.random().toString().substring(2,8);

    this.sessionPath = this.sessionClient.projectAgentSessionPath(
        config.gcp.project, // projectId
        this.sessionId
    );

    this.contextsClient = new dialogflow.ContextsClient();
    this.contextPath = this.contextsClient.projectAgentSessionContextPath(config.gcp.project, this.sessionId, 'zuzucontext');
    this.speechCtx = new SpeechContextManager(config);

    const dfReguestAudioConfig = {
      audioEncoding: config.audiorecorder.encoding,
      sampleRateHertz: config.audiorecorder.rate,
      languageCode: 'en-US',
      speechContexts: [],  // Filled in for each request
    };

    this.sessionContext = {
      session: this.sessionPath,
      queryParams: {
        session: this.sessionPath,
        contexts: []
      },
      queryInput: {
          audioConfig: dfReguestAudioConfig,
          singleUtterance: true,
      },
    };

    // initial context
    this.createContext = async function () {
        const request = {
            parent: this.sessionPath,
            context: {
                name: this.contextPath,
                lifespanCount: 1
            }
        };
        console.log(request);
        const [context] = await this.contextsClient.createContext(request);
        return context;
    }
    this.createContext().then((returnedContext) => {
        console.log("createContext() returns:\n" + JSON.stringify(returnedContext));
        this.sessionContext.queryParams.contexts = [returnedContext];
    });

    this.event = async function(eventName, parameters, callback, err) {
        console.log("Call DialogFlow event: " + eventName);
        eventObj = {
            "name": eventName,
            // Note that in DialogFlow if an event has the same name as a context, then the event will shadow the context. Only parameters from the event are useable.
            "parameters": parameters,
            "languageCode": "en-US"
        };
        // deep copy
        const sessionContext = JSON.parse(JSON.stringify(this.sessionContext));
        sessionContext.queryInput.event = eventObj;
        const responses = await this.nextIntent(sessionContext);
        robot.play(responses[0].outputAudio);
    };

    this.nextIntent = async function (sessionContext) {
        if (!sessionContext) sessionContext = this.sessionContext;

//         console.log(JSON.stringify(sessionContext, null, "  "));
        const responses = await this.sessionClient.detectIntent(sessionContext);
        console.log(responses);
        console.log(JSON.stringify(responses[0].queryResult));
        this.sessionContext.queryParams.contexts = responses[0].queryResult.outputContexts;
        return responses;
    };

    this._formatContext = function (contextName, parameters, lifespanCount) {
        if(parameters === undefined) parameters = null;
        if(!lifespanCount) lifespanCount = 5;

        const contextPath = this.contextsClient.projectAgentSessionContextPath(config.gcp.project, this.sessionId, contextName);
        return {name: contextPath, lifespanCount: lifespanCount, parameters: parameters};
    };

    // DialogFlow custom entities must be passed around in this crazy specific structure. Because just understanding a string wouldn't be helpful at all...
    this.formatCustomName = function (name) {
        return  {
                    "fields": {
                        "customName": {
                            "structValue": {
                                "fields": {
                                    "name.original": {
                                        "stringValue": name,
                                        "kind": "stringValue"
                                    },
                                    "name": {
                                        "stringValue": name,
                                        "kind": "stringValue"
                                    }
                                }
                            },
                            "kind": "structValue"
                        },
                        "customName.original": {
                            "stringValue": name,
                            "kind": "stringValue"
                        }
                    }
                }
    };

    this.setContext = function (contextName, parameters, lifespanCount) {
        this.sessionContext.queryParams.contexts = [this._formatContext(contextName, parameters, lifespanCount)];
    };

    this.deleteContext = function(contextName) {
        const fullContextName = "projects/"+config.gcp.project+"/agent/sessions/" + this.sessionId + "/contexts/" + contextName;
        for(let i=0; i<this.sessionContext.queryParams.contexts.length; i++) {
            if ( this.sessionContext.queryParams.contexts[i].name == fullContextName ) {
                console.log("Deleting " + fullContextName + " from session context");
                this.sessionContext.queryParams.contexts.splice(i,1);
            }
        }
    };

    this.addContext = function (contextName, parameters, lifespanCount) {
        this.deleteContext(contextName);
        console.log("Adding new context " + contextName);
        const newContext = this._formatContext(contextName, parameters, lifespanCount);
        this.sessionContext.queryParams.contexts.push(newContext);
        return newContext;
    };

    this.audioRecorder = null;
    this.audioCapture = function () {
        console.log('Start capturing audio');
        this.audioRecorder = new AudioRecorder(config.audiorecorder, console);
        this.audioRecorder.start();
        return this.audioRecorder.stream();
    };

    this.audioStream = null;
    this.streamIntent = async function (sessionContext, callback) {
      if (!sessionContext) sessionContext = this.sessionContext;

      sessionContext.queryInput.audioConfig.speechContexts = this.speechCtx.getContexts();

      this.audioStream = this.audioCapture();

      console.log("Call DialogFlow using " + JSON.stringify(this.audioStream) + " as input");
      // Create a stream for the streaming request.
      const detectStream = this.sessionClient
        .streamingDetectIntent()
        .on('error', (err) => {console.log(err)})
        .on('data', this._streamIntentCallback(this))
        .on('end', () => {console.log('end of audio streaming'); this.listenProgress=0; if (callback) callback();});

      // Send the initial stream request to config for audio input.
      console.log(JSON.stringify(sessionContext));
      detectStream.write(sessionContext);
      await pump(
        this.audioStream,
        // Format the audio stream into the request format.
        new Transform({
          objectMode: true,
          transform: (obj, _, next) => {
            next(null, {inputAudio: obj});
          },
        }),
        detectStream
      );

    };

    this.listenProgress = 0;
    this._streamIntentCallback = function (dfEngine) {
        assert(this.listenProgress == 0);
        return function (data) {
            //console.log(data);
            dfEngine.listenProgress++;
            if (data.recognitionResult) {
                console.log(
                    `Intermediate transcript: ${data.recognitionResult.transcript}`
                );
            } else if (data.queryResult) {
                console.log('Detected intent:');
                console.log(JSON.stringify(data));

                const queryResult = data.queryResult;
                if (queryResult.intent && queryResult.fulfillmentText !== "") {
                    // Save context for next call
                    dfEngine.sessionContext.queryParams.contexts = queryResult.outputContexts;
                    // The audio buffer is empty when streaming :-(
                    //play(data.outputAudio);
                    robot.say(queryResult.fulfillmentText);
                }
                dfEngine.dfActions.action(queryResult);
            }
        };
    };

    this.interrupt = function() {
        assert(this.listenProgress == 0);
        if ( this.audioRecorder ) {
            console.log("Closing DialogFlow audio stream as you didn't say anything yet.");
            this.audioRecorder.stop();
        };
    };

    return this;
}

function SpeechContextManager (config) {
    this.myName = config.robot.name_for_tts
    const zuzuWordsContext = {
        "phrases": [
            this.myName, this.myName + " Help", this.myName + " Go to sleep", this.myName + " Add new friend",
            "Command", "Command Help", "Command Go to sleep", "Command Add new friend",
        ],
        "boost": 100
    };

    // Since Google doesn't know Finnish names - and refuses to learn - we have to feed them in a
    // speech context. They need a relatively high boost too.
    const familyNamesContext = {
        "phrases": [
            "Ebba", "Albert", "Sanna", "Henrik", "Roosa", "Sampsa", "Osmo", "Virpi", "Ritva", "Katri",
            "Tom", "Kati", "Oona", "Peetu"
        ],
        "boost": 20
    };

    const friendsNamesContext = {
        "phrases": [
            "Lumi", "Lassi", "Lenni", "Sampo", "Riina", "Aino", "Van", "Emma", "Markku", "Elvi", "Olavi", "Elina", "Lauri", "Ada", "Heidi", "Tuomas", "Tumppi"
        ],
        "boost": 5
    };

    this.getContexts = function () {
        return [zuzuWordsContext, familyNamesContext, friendsNamesContext];
    }

    return this;
}


module.exports.create = function (robot, config) {return new DialogFlowEngine(robot, config);};
