const AudioRecorder = require('node-audiorecorder');
const util = require('util');
const {Transform, pipeline} = require('stream');
const play = require('../play/play');
const tts = require('../gcp/text-to-speech.js');
const DialogFlowActions = require('./actions');

const pump = util.promisify(pipeline);
// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

///// Record audio into file - non blocking

// Options is an optional parameter for the constructor call.
// If an option is not given the default value, as seen below, will be used.
const options = {
  program: `rec`,     // Which program to use, either `arecord`, `rec`, or `sox`.
  device: null,       // Recording device to use. (only for `arecord`)
 
  bits: 16,           // Sample size. (only for `rec` and `sox`)
  channels: 1,        // Channel count.
  encoding: `signed-integer`,  // Encoding type. (only for `rec` and `sox`)
  format: `S16_LE`,   // Encoding type. (only for `arecord`)
  rate: 16000,        // Sample rate.
  type: `wav`,        // Format type.
 
  // Following options only available when using `rec` or `sox`.
  silence: 3,         // Duration of silence in seconds before it stops recording.
  thresholdStart: 0.1,  // Silence threshold to start recording.
  thresholdStop: 1.1,   // Silence threshold to stop recording.
  keepSilence: true   // Keep the silence in the recording.
};

const dfReguestAudioConfig = {
    audioEncoding: options.encoding,
    sampleRateHertz: options.rate,
    languageCode: 'en-US',
    speechContexts: [],  // Filled in for each request
};

const audioCapture = function () {
    console.log('Start capturing audio');
    let audioRecorder = new AudioRecorder(options, console);
    audioRecorder.start();
    return audioRecorder.stream();
};

///// DialogFlow

function DialogFlowEngine (robot) {
    this.dfActions = DialogFlowActions(robot);
    this.sessionClient = new dialogflow.SessionsClient();
    this.sessionId = Math.random().toString().substring(2,8);

    this.sessionPath = this.sessionClient.projectAgentSessionPath(
        'zuzu2-vpxh', // projectId
        this.sessionId
    );

    this.contextsClient = new dialogflow.ContextsClient();
    this.contextPath = this.contextsClient.projectAgentSessionContextPath('zuzu2-vpxh', this.sessionId, 'zuzucontext');
    this.speechCtx = new SpeechContextManager();

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
        await play(responses[0].outputAudio);
    };

    this.nextIntent = async function (sessionContext) {
        if (!sessionContext) sessionContext = this.sessionContext;

        console.log(JSON.stringify(sessionContext, null, "  "));
        const responses = await this.sessionClient.detectIntent(sessionContext);
        console.log(responses);
        console.log(JSON.stringify(responses[0].queryResult));
        this.sessionContext.queryParams.contexts = responses[0].queryResult.outputContexts;
        return responses;
    };

    this._formatContext = function (contextName, parameters, lifespanCount) {
        if(parameters === undefined) parameters = null;
        if(!lifespanCount) lifespanCount = 5;

        const contextPath = this.contextsClient.projectAgentSessionContextPath('zuzu2-vpxh', this.sessionId, contextName);
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
        const fullContextName = "projects/zuzu2-vpxh/agent/sessions/" + this.sessionId + "/contexts/" + contextName;
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

    this.streamIntent = async function (sessionContext) {
      if (!sessionContext) sessionContext = this.sessionContext;

      sessionContext.queryInput.audioConfig.speechContexts = this.speechCtx.getContexts();

      const audioStream = audioCapture();

      console.log("Call DialogFlow using " + JSON.stringify(audioStream) + " as input");
      // Create a stream for the streaming request.
      const detectStream = this.sessionClient
        .streamingDetectIntent()
        .on('error', (err) => console.log(err))
        .on('data', this._streamIntentCallback(this))
        .on('end', () => {console.log('end of audio streaming');});

      // Send the initial stream request to config for audio input.
      console.log(JSON.stringify(sessionContext));
      detectStream.write(sessionContext);
      await pump(
        audioStream,
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

    this._streamIntentCallback = function (dfEngine) {
        return function (data) {
            //console.log(data);
            if (data.recognitionResult) {
                console.log(
                    `Intermediate transcript: ${data.recognitionResult.transcript}`
                );
            } else if (data.queryResult) {
                console.log('Detected intent:');
                console.log(JSON.stringify(data));

                // Save context for next call
                const queryResult = data.queryResult;
                dfEngine.sessionContext.queryParams.contexts = queryResult.outputContexts;
                // The audio buffer is empty when streaming :-(
                //play(data.outputAudio);
                tts(queryResult.fulfillmentText);
                dfEngine.dfActions.action(queryResult);
            }
        };
    };


    return this;
}

function SpeechContextManager () {
    // Since Google doesn't know Finnish names - and refuses to learn - we have to feed them in a
    // speech context. They need a relatively high boost too.

    let familyNamesContext = {
        "phrases": [
            "Ebba", "Albert", "Sanna", "Henrik", "Roosa", "Sampsa", "Osmo", "Virpi", "Ritva", "Katri",
            "Tom", "Kati", "Oona", "Peetu"
        ],
        "boost": 10
    };

    let friendsNamesContext = {
        "phrases": [
            "Lumi", "Lassi", "Lenni", "Sampo", "Riina", "Aino", "Van", "Emma", "Markku", "Elvi", "Olavi", "Elina", "Lauri", "Ada", "Heidi", "Tuomas", "Tumppi"
        ],
        "boost": 5
    };

    this.getContexts = function () {
        return [familyNamesContext, friendsNamesContext];
    }

    return this;
}


module.exports.create = function (robot) {return new DialogFlowEngine(robot);};