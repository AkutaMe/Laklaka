const express = require("express");
require("dotenv").config();
const { app, BrowserWindow } = require("electron");

const log = require("electron-log");
log.transports.file.resolvePathFn = () => __dirname + "/log.log";

console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;
console.debug = log.debug;

console.log("Test");

process.on("uncaughtException", (err) => {
  log.error(err);
  app.quit();
});

const { OpenAI } = require("openai");
const openai = new OpenAI({
  apiKey: "",
});

let tests = [];

const fs = require("fs");
const { generateSpeech } = require("./functions/textToSpeech.js");
const { translate } = require("./functions/translate.js");

// Google Cloud
const speech = require("@google-cloud/speech");
const speechClient = new speech.SpeechClient({
  keyFilename: "resources/credentials.json",
});

const eapp = express();
eapp.use(express.json());
const port = process.env.PORT || 1337;
const server = require("http").createServer(eapp);

const io = require("socket.io")(server);

eapp.post("/generate-test", async (req, res) => {
  const subject = await translate(req.body.subject, "auto", "en");
  const messages = [
    {
      role: "system",
      content: `The AI assistant shall be a test creator. 
The AI assistant shall create a test based on the subject.
The AI assistant shall only create as much questions as the user asks.
The AI assistant shall reply in the following JSON: 
{ "test": [ { "type": "text", "question": "What's 1+1", "difficulty": "easy" } ] }.
Possible types are: "text", "select". 
When using the "select" type, the AI assistant shall reply in this JSON: 
{ "test": [ { "type": "select", "question": "What's 1+1", "enum": [ "1", "2", "3", "4" ] } ] }.
After the AI assistant has created the test, the AI assistant shall also correct the user's input.
The AI assistant shall reply in the following JSON when correcting the test:
{ "correction": [ { "correct_answer": "2", "explanation": "EXPLANATION_GOES_HERE" } ] }.
The AI assistant shall only give an explenation and correct_answer when the answer is wrong.
The AI assistant shall give a detailed explenation when it's wrong.
The AI assistant shall follow this example transcript transcript:
user: { "subject": "Square roots", "questions": 1, "difficulty": "medium" }
AI assistant: { "test": [ { "type": "text", "question": "What is the square root of 121?" }, { "type": "text", "question": "What is the square root of 625?" } ] }
user: [ "15", "25" ]
AI assistant: { "correction": [ { "correct": false, "correct_answer": "11", "explanation": "The square root of 121 is the number that, when multiplied by itself, gives 121. In this case, 11 * 11 equals 121, not 15." }, { "correct": true } ] }
`,
    },
    {
      role: "user",
      content: `{ "subject": ${subject}, "questions": ${req.body.questions}, "difficulty": "${req.body.difficulty}" }`,
    },
  ];
  let completion = await openai.chat.completions.create({
    model: "gpt-4-0125-preview",
    messages,
    response_format: {
      type: "json_object",
    },
    temperature: 0.85,
  });
  completion = completion.choices[0].message.content;
  messages.push({
    role: "assistant",
    content: completion,
  });
  let obj = JSON.parse(completion);
  let promises = [];
  for (let qi = 0; qi < obj.test.length; qi++) {
    let q = obj.test[qi];
    if (q.type === "text") {
      promises.push(async () => {
        return new Promise(async (resolve, reject) => {
          const translation = await translate(q.question, "en", "ka");
          obj.test[qi].question = translation;
          log.log(translation);
          resolve();
        });
      });
    }
    if (q.type === "select") {
      promises.push(async () => {
        return new Promise(async (resolve, reject) => {
          let promisesCount = 0;
          let threshold = 1 + q.enum.length;
          translate(q.question, "en", "ka").then((translation) => {
            obj.test[qi].question = translation;
            log.log(translation);
            promisesCount++;
            if (promisesCount === threshold) resolve();
          });
          for (let i = 0; i < q.enum.length; i++) {
            translate(q.enum[i], "en", "ka").then((translation) => {
              obj.test[qi].enum[i] = translation;
              log.log(translation);
              promisesCount++;
              if (promisesCount === threshold) resolve();
            });
          }
        });
      });
    }
  }

  await Promise.all(promises.map((p) => p()));
  log.log(JSON.stringify(obj));

  const id =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  res.send({
    id,
    ...obj,
  });

  tests.push({
    id,
    messages,
  });
});

eapp.post("/correct-test", async (req, res) => {
  let { id, answers } = req.body;
  const test = tests.find((test) => test.id === id);
  const messages = test.messages;

  let promises = [];

  answers.forEach((answer, i) => {
    promises.push(async () => {
      return new Promise(async (resolve, reject) => {
        const translation = await translate(answer, "auto", "en");
        answers[i] = translation;
        log.log(translation);
        resolve();
      });
    });
  });

  await Promise.all(promises.map((p) => p()));

  messages.push({
    role: "user",
    content: JSON.stringify(answers),
  });

  let completion = await openai.chat.completions.create({
    model: "gpt-4-0125-preview",
    messages,
    response_format: {
      type: "json_object",
    },
    temperature: 0.3,
  });

  completion = completion.choices[0].message.content;
  tests = tests.filter((test) => test.id !== id);
  let obj = JSON.parse(completion);
  log.log(obj);

  promises = obj.correction.map(async (c, ci) => {
    const translateAndReplace = async (property) => {
      if (c[property]) {
        try {
          const translation = await translate(c[property], "en", "ka");
          obj.correction[ci][property] = translation;
          log.log(translation);
        } catch (error) {
          log.error("Error translating:", error);
        }
      }
    };

    await Promise.all([
      translateAndReplace("explanation"),
      translateAndReplace("correct_answer"),
    ]);
  });

  try {
    await Promise.all(promises);
    log.log(JSON.stringify(obj));
  } catch (error) {
    log.error("Error executing promises:", error);
  }

  res.send(obj);
});

// =========================== ROUTERS ================================ //

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: true,
    },
    icon: `${__dirname}/icon.ico`,
  });

  mainWindow.loadFile("public/index.html");

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (mainWindow === null) createWindow();
});

// =========================== SOCKET.IO ================================ //

io.on("connection", function (client) {
  log.log("Client Connected to server");
  let recognizeStream = null;

  client.on("join", function () {
    client.emit("messages", "Socket Connected to Server");
  });

  client.on("messages", function (data) {
    client.emit("broad", data);
  });

  client.on("startGoogleCloudStream", function (data) {
    startRecognitionStream(this, data);
  });

  client.on("endGoogleCloudStream", function () {
    stopRecognitionStream();
  });

  client.on("binaryData", function (data) {
    // log.log(data); //log binary data
    if (recognizeStream !== null) {
      recognizeStream.write(data);
    }
  });

  client.on("message", async (data) => {
    try {
      let sentences = [];
      let sentence = "";

      const translation = await translate(data, "auto", "en");

      const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "The AI assistant shall be a teacher. The AI assistant should explain the subjects the user asks for. The AI assistant shall not use markdown. The AI assistant shall use punctuation marks a lot so it's easier for the text to speech, avoid using comma's, use a dot instead. The AI assistant shall explain everything verbally, so no mathematical calculations e.g. frac{1}{2}.",
          },
          { role: "user", content: translation },
        ],
        stream: true,
      });

      if (!fs.existsSync("resources/output")) {
        fs.mkdirSync("resources/output");
      }

      for await (const chunk of stream) {
        let output = chunk.choices[0]?.delta?.content || "";
        sentence += output;
        if (
          sentence.endsWith(".") ||
          sentence.endsWith("?") ||
          sentence.endsWith("!")
        ) {
          sentence = sentence.trim();
          sentences.push(sentence);
          const id = sentences.length;
          translate(sentence, "en", "ka").then((translation) => {
            client.emit("message", translation);
            generateSpeech(translation, "ka-GE").then((data) => {
              try {
                fs.writeFileSync(`resources/output/${id}.mp3`, data);
              } catch (e) {
                log.error(e);
              }
              client.emit("addToQueue", `../output/${id}.mp3`);
              sentence = "";
            });
          });
          sentence = "";
        }
      }
    } catch (e) {
      log.error(e);
    }
  });

  function startRecognitionStream(client) {
    try {
      recognizeStream = speechClient
        .streamingRecognize(request)
        .on("error", (err) => {
          log.error(err);
          process.exit(1);
        })
        .on("data", (data) => {
          client.emit("speechData", data);

          if (data.results[0] && data.results[0].isFinal) {
            stopRecognitionStream();
            startRecognitionStream(client);
          }
        });
    } catch (e) {
      log.error(e);
      app.quit();
    }
  }

  function stopRecognitionStream() {
    if (recognizeStream) {
      recognizeStream.end();
    }
    recognizeStream = null;
  }
});

// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = "LINEAR16";
const sampleRateHertz = 16000;
const languageCode = "ka-GE"; //en-US

const request = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    profanityFilter: false,
    enableWordTimeOffsets: true,
    // speechContexts: [{
    //     phrases: ["hoful","shwazil"]
    //    }] // add your own speech context for better recognition
  },
  interimResults: true, // If you want interim results, set this to true
};

// =========================== START SERVER ================================ //

server.listen(port, function () {
  //http listen, to make socket work
  // app.address = "127.0.0.1";
  log.log("Server started on port:" + port);
});
