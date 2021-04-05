const AudioRecorder = require('node-audiorecorder');
const util = require('util');
const {Transform, pipeline} = require('stream');

const pump = util.promisify(pipeline);
// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

// Record audio into file - non blocking

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


const audioCapture = function () {
    console.log('Start capturing audio');
    let audioRecorder = new AudioRecorder(options, console);
    audioRecorder.start();
    return audioRecorder.stream();
};

const dialogFlowStart = async function(callback, err) {
    const audioStream = audioCapture();
    greetStrangerIntent(audioStream, callback, err);
};

const getNameInResult = function(queryResult) {
    console.log(`  Query: ${queryResult.queryText}`);
    console.log(`  Response: ${queryResult.fulfillmentText}`);

    if (! (queryResult.intent && queryResult.allRequiredParamsPresent) )
        return null;

    console.log(`  Intent: ${queryResult.intent.displayName}`);

    if (queryResult.parameters && queryResult.parameters.fields && queryResult.parameters.fields.customName && queryResult.parameters.fields.customName.stringValue)
        return queryResult.parameters.fields.customName.stringValue;

    if (queryResult.parameters &&
        queryResult.parameters.fields &&
        queryResult.parameters.fields.customName &&
        queryResult.parameters.fields.customName.structValue &&
        queryResult.parameters.fields.customName.structValue.fields &&
        queryResult.parameters.fields.customName.structValue.fields.name &&
        queryResult.parameters.fields.customName.structValue.fields.name.stringValue
    )
        return queryResult.parameters.fields.customName.structValue.fields.name.stringValue;
};

module.exports = {start: dialogFlowStart, getNameInResult: getNameInResult}


// The rest is dialogflow code from
// https://cloud.google.com/dialogflow/es/docs/how/detect-intent-stream

// The path to the local file on which to perform speech recognition, e.g.
// /path/to/audio.raw const filename = '/path/to/audio.raw';

// The encoding of the audio file, e.g. 'AUDIO_ENCODING_LINEAR_16'
// const encoding = 'AUDIO_ENCODING_LINEAR_16';

// The sample rate of the audio file in hertz, e.g. 16000
// const sampleRateHertz = 16000;

// The BCP-47 language code to use, e.g. 'en-US'
// const languageCode = 'en-US';
// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();
const sessionId = Math.random().toString().substring(2,8);

const sessionPath = sessionClient.projectAgentSessionPath(
  'zuzu-robotti', // projectId
  sessionId
);

const contextsClient = new dialogflow.ContextsClient();
async function createContext() {
    const contextPath = contextsClient.projectAgentSessionContextPath('zuzu-robotti', sessionId, 'greetStrangerContext');

    const request = {
        parent: sessionPath,
        context: {
            name: contextPath,
            lifespanCount: 1
        }
    };
    console.log(request);
    const [context] = await contextsClient.createContext(request);
    console.log(context);
    return context;
}

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

let request = {
  session: sessionPath,
  queryParams: {
    session: sessionPath,
    contexts: []
  },
  queryInput: {
    audioConfig: {
      audioEncoding: options.encoding,
      sampleRateHertz: options.rate,
      languageCode: 'en-US',
      speechContexts: [familyNamesContext, friendsNamesContext],
    },
    singleUtterance: true,
  },
};
// initial context
createContext().then((context) => {request.queryParams.contexts = [context]; console.log(context);});

const greetStrangerIntent = async function (audioStream, resolve, reject) {
    console.log("Call DialogFlow using audioStream \n" + JSON.stringify(audioStream) + "\n as input");
    // Create a stream for the streaming request.
    const detectStream = sessionClient
    .streamingDetectIntent()
    .on('error', reject)
    .on('data', resolve)
    .on('end', () => {console.log('end of audio streaming');});

    // Send the initial stream request to config for audio input.
    console.log("detectStream request:\n" + JSON.stringify(request));
    detectStream.write(request);
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


