/**
 * Copyright 2017, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// https://github.com/BenBergman/dialogflow-nodejs-client-v2/blob/master/samples/detect.js#L252

'use strict';

const fs = require('fs');
const {Transform, pipeline} = require('stream');
const util = require('util');
const pump = util.promisify(pipeline);
const through2 = require('through2');
const AudioRecorder = require('node-audiorecorder');

function detectTextIntent(projectId, sessionId, queries, languageCode) {
  // [START dialogflow_detect_intent_text]
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates a sessison client
  const sessionClient = new dialogflow.SessionsClient();

  if (!queries || !queries.length) {
    return;
  }

  // The path to identify the agent that owns the created intent.
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);

  let promise;

  // Detects the intent of the queries.
  for (const query of queries) {
    // The text query request.
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: query,
          languageCode: languageCode,
        },
      },
    };

    if (!promise) {
      // First query.
      console.log(`Sending query "${query}"`);
      promise = sessionClient.detectIntent(request);
    } else {
      promise = promise.then(responses => {
        console.log('Detected intent');
        const response = responses[0];
        logQueryResult(sessionClient, response.queryResult);

        // Use output contexts as input contexts for the next query.
        response.queryResult.outputContexts.forEach(context => {
          // There is a bug in gRPC that the returned google.protobuf.Struct
          // value contains fields with value of null, which causes error
          // when encoding it back. Converting to JSON and back to proto
          // removes those values.
        });
        request.queryParams = {
          contexts: response.queryResult.outputContexts,
        };

        console.log(`Sending query "${query}"`);
        return sessionClient.detectIntent(request);
      });
    }
  }

  promise
    .then(responses => {
      console.log('Detected intent');
      logQueryResult(sessionClient, responses[0].queryResult);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });

  // [END dialogflow_detect_intent_text]
}

function detectEventIntent(projectId, sessionId, eventName, languageCode) {
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates a sessison client
  const sessionClient = new dialogflow.SessionsClient();

  // The path to identify the agent that owns the created intent.
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      event: {
        name: eventName,
        parameters: {foo: 'bar'},
        languageCode: languageCode,
      },
    },
  };

  sessionClient
    .detectIntent(request)
    .then(responses => {
      console.log('Detected intent');
      logQueryResult(sessionClient, responses[0].queryResult);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

function detectAudioIntent(
  projectId,
  sessionId,
  filename,
  encoding,
  sampleRateHertz,
  languageCode
) {
  // [END dialogflow_detect_intent_audio]
}

function streamingDetectIntent(
  projectId,
  sessionId,
  filename,
  encoding,
  sampleRateHertz,
  languageCode
) {
  // [START dialogflow_detect_intent_streaming]
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates a sessison client
  const sessionClient = new dialogflow.SessionsClient();

  // The path to the local file on which to perform speech recognition, e.g.
  // /path/to/audio.raw const filename = '/path/to/audio.raw';

  // The encoding of the audio file, e.g. 'AUDIO_ENCODING_LINEAR16'
  // const encoding = 'AUDIO_ENCODING_LINEAR16';

  // The sample rate of the audio file in hertz, e.g. 16000
  // const sampleRateHertz = 16000;

  // The BCP-47 language code to use, e.g. 'en-US'
  // const languageCode = 'en-US';
  let sessionPath = sessionClient.sessionPath(projectId, sessionId);

  const initialStreamRequest = {
    session: sessionPath,
    queryParams: {
      session: sessionClient.sessionPath(projectId, sessionId),
    },
    queryInput: {
      audioConfig: {
        audioEncoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
      },
      singleUtterance: true,
    },
  };

  // Create a stream for the streaming request.
  const detectStream = sessionClient
    .streamingDetectIntent()
    .on('error', console.error)
    .on('data', data => {
      if (data.recognitionResult) {
        console.log(
          `Intermediate transcript: ${data.recognitionResult.transcript}`
        );
      } else {
        console.log(`Detected intent:`);
        logQueryResult(sessionClient, data.queryResult);
      }
    });

  // Write the initial stream request to config for audio input.
  detectStream.write(initialStreamRequest);

  // Stream an audio file from disk to the Conversation API, e.g.
  // "./resources/audio.raw"
  pump(
    fs.createReadStream(filename),
    // Format the audio stream into the request format.
    through2.obj((obj, _, next) => {
      next(null, {inputAudio: obj});
    }),
    detectStream
  );
  // [END dialogflow_detect_intent_streaming]
}

function streamingMicDetectIntent(
  projectId,
  sessionId,
  encoding,
  sampleRateHertz,
  languageCode
) {
  // [START dialogflow_detect_intent_streaming]
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates a sessison client
  const sessionClient = new dialogflow.SessionsClient();

  // The path to the local file on which to perform speech recognition, e.g.
  // /path/to/audio.raw const filename = '/path/to/audio.raw';

  // The encoding of the audio file, e.g. 'AUDIO_ENCODING_LINEAR16'
  // const encoding = 'AUDIO_ENCODING_LINEAR16';

  // The sample rate of the audio file in hertz, e.g. 16000
  // const sampleRateHertz = 16000;

  // The BCP-47 language code to use, e.g. 'en-US'
  // const languageCode = 'en-US';
  let sessionPath = sessionClient.sessionPath(projectId, sessionId);

  const initialStreamRequest = {
    session: sessionPath,
    queryParams: {
      session: sessionClient.sessionPath(projectId, sessionId),
    },
    queryInput: {
      audioConfig: {
        audioEncoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
      },
      singleUtterance: true,
    },
  };

  // Create a stream for the streaming request.
  const detectStream = sessionClient
    .streamingDetectIntent()
    .on('error', console.error)
    .on('data', data => {
      if (data.recognitionResult) {
        console.log(
          `Intermediate transcript: ${data.recognitionResult.transcript}`
        );
      } else {
        console.log(`Detected intent:`);
        logQueryResult(sessionClient, data.queryResult);
      }
    });

  // Write the initial stream request to config for audio input.
  detectStream.write(initialStreamRequest);


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
  thresholdStop: 0.3,   // Silence threshold to stop recording.
  keepSilence: true   // Keep the silence in the recording.
};


const audioCapture = function () {
    console.log('Start capturing audio');
    let audioRecorder = new AudioRecorder(options, console);
    audioRecorder.start();
    return audioRecorder.stream();
};
  // Stream an audio file from disk to the Conversation API, e.g.
  // "./resources/audio.raw"
  pump(
    audioCapture,
    // Format the audio stream into the request format.
    through2.obj((obj, _, next) => {
      next(null, {inputAudio: obj});
    }),
    detectStream
  );
  // [END dialogflow_detect_intent_streaming]
}

function logQueryResult(sessionClient, result) {
  // Imports the Dialogflow library
  const dialogflow = require('dialogflow');

  // Instantiates a context client
  const contextClient = new dialogflow.ContextsClient();

  console.log(`  Query: ${result.queryText}`);
  console.log(`  Response: ${result.fulfillmentText}`);
  if (result.intent) {
    console.log(`  Intent: ${result.intent.displayName}`);
  } else {
    console.log(`  No intent matched.`);
  }
  const parameters = JSON.stringify(result.parameters);
  console.log(`  Parameters: ${parameters}`);
  if (result.outputContexts && result.outputContexts.length) {
    console.log(`  Output contexts:`);
    result.outputContexts.forEach(context => {
      const contextId = contextClient.matchContextFromContextName(context.name);
      const contextParameters = JSON.stringify(context.parameters
      );
      console.log(`    ${contextId}`);
      console.log(`      lifespan: ${context.lifespanCount}`);
      console.log(`      parameters: ${contextParameters}`);
    });
  }
}

const cli = require(`yargs`)
  .demand(1)
  .options({
    projectId: {
      alias: 'p',
      default: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
      description:
        'The Project ID to use. Defaults to the value of the ' +
        'GCLOUD_PROJECT or GOOGLE_CLOUD_PROJECT environment variables.',
      requiresArg: true,
      type: 'string',
    },
    sessionId: {
      alias: 's',
      default: require('uuid/v1')(),
      type: 'string',
      requiresArg: true,
      description:
        'The identifier of the detect session. Defaults to a random UUID.',
    },
    languageCode: {
      alias: 'l',
      default: 'en-US',
      type: 'string',
      requiresArg: true,
      description: 'The language code of the query. Defaults to "en-US".',
    },
    encoding: {
      alias: 'e',
      default: 'AUDIO_ENCODING_LINEAR16',
      choices: [
        'AUDIO_ENCODING_LINEAR16',
        'AUDIO_ENCODING_FLAC',
        'AUDIO_ENCODING_MULAW',
        'AUDIO_ENCODING_AMR',
        'AUDIO_ENCODING_AMR_WB',
        'AUDIO_ENCODING_OGG_OPUS',
        'AUDIO_ENCODING_SPEEX_WITH_HEADER_BYTE',
      ],
      requiresArg: true,
      description: 'The encoding of the input audio.',
    },
    sampleRateHertz: {
      alias: 'r',
      type: 'number',
      description:
        'The sample rate in Hz of the input audio. Only ' +
        'required if the input audio is in raw format.',
    },
  })
  .demandOption(
    'projectId',
    "Please provide your Dialogflow agent's project ID with the -p flag or through the GOOGLE_CLOUD_PROJECT env var"
  )
  .command(
    `text`,
    `Detects the intent for text queries.`,
    {
      queries: {
        alias: 'q',
        array: true,
        string: true,
        demandOption: true,
        requiresArg: true,
        description: 'An array of text queries',
      },
    },
    opts =>
      detectTextIntent(
        opts.projectId,
        opts.sessionId,
        opts.queries,
        opts.languageCode
      )
  )
  .command(
    `event <eventName>`,
    `Detects the intent for a client-generated event name.`,
    {},
    opts =>
      detectEventIntent(
        opts.projectId,
        opts.sessionId,
        opts.eventName,
        opts.languageCode
      )
  )
  .command(
    `audio <filename>`,
    `Detects the intent for audio queries in a local file.`,
    {},
    opts =>
      detectAudioIntent(
        opts.projectId,
        opts.sessionId,
        opts.filename,
        opts.encoding,
        opts.sampleRateHertz,
        opts.languageCode
      )
  )
  .command(
    `stream <filename>`,
    `Detects the intent in a local audio file by streaming it to the ` +
      `Conversation API.`,
    {},
    opts =>
      streamingDetectIntent(
        opts.projectId,
        opts.sessionId,
        opts.filename,
        opts.encoding,
        opts.sampleRateHertz,
        opts.languageCode
      )
  )
  .command(
    `stream-mic`,
    `Detects the intent spoken into the microphone by streaming it to the ` +
      `Conversation API.`,
    {},
    opts =>
      streamingMicDetectIntent(
        opts.projectId,
        opts.sessionId,
        opts.encoding,
        opts.sampleRateHertz,
        opts.languageCode
      )
  )
  .example(
    `node $0 text -q "hello" "book a room" "Mountain View" ` +
      `"today" "230pm" "half an hour" "two people" "A" "yes"`
  )
  .example(`node $0 event order_pizza`)
  .example(`node $0 audio resources/book_a_room.wav -r 16000`)
  .example(`node $0 stream resources/mountain_view.wav -r 16000`)
  .wrap(120)
  .recommendCommands()
  .epilogue(
    `For more information, see https://cloud.google.com/conversation/docs`
  )
  .help()
  .strict();

if (module === require.main) {
  cli.parse(process.argv.slice(2));
}
