const socket = io.connect('http://localhost:1337');
let queue = []
let currentlyPlaying = false;
let bufferSize = 2048, AudioContext, context, processor, input, globalStream;


let audioElement = document.querySelector('audio'),
finalWord = false,
removeLastSentence = true,
streamStreaming = false,
endtalking;


const constraints = {
  audio: true,
  video: false,
};

//================= RECORDING =================

async function initRecording() {
  socket.emit('startGoogleCloudStream', '');
  streamStreaming = true;
  AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext({
    latencyHint: 'interactive'
  });

  await context.audioWorklet.addModule('./js/recorderWorkletProcessor.js')
  context.resume();
  
  globalStream = await navigator.mediaDevices.getUserMedia(constraints)
  input = context.createMediaStreamSource(globalStream)
  processor = new window.AudioWorkletNode(
    context,
    'recorder.worklet'
  );
  processor.connect(context.destination);
  context.resume()
  input.connect(processor)
  processor.port.onmessage = (e) => {
    const audioData = e.data;
    microphoneProcess(audioData)
  }
}

function microphoneProcess(buffer) {
  socket.emit('binaryData', buffer);
}

//================= INTERFACE =================
var startButton = document.getElementById('start-btn');
startButton.addEventListener('click', startRecording);

function startRecording() {
  initRecording();
  document.getElementById('start-btn').style.display = 'none'
}

function sendMessage(msg) {
  const chatwindow = document.getElementById('chat-window');
  let bubble = document.createElement('div');
  bubble.classList.add('user-bubble');
  bubble.innerText = msg;
  chatwindow.appendChild(bubble);
  socket.emit('message', msg);
}

function checkqueue() {
  if (currentlyPlaying) return
  if (queue.length > 0) {
    let audio = new Audio(queue[0]);
    audio.play();
    currentlyPlaying = true;
    queue.shift();
    audio.onended = () => {
      currentlyPlaying = false;
      checkqueue();
    }
  }
}

function stopRecording() {
  document.getElementById('start-btn').style.display = 'flex'
  streamStreaming = false;
  socket.emit('endGoogleCloudStream', '');

  let track = globalStream.getTracks()[0];
  track.stop();

  input.disconnect(processor);
  processor.disconnect(context.destination);
  context.close().then(function () {
    input = null;
    processor = null;
    context = null;
    AudioContext = null;
    startButton.disabled = false;
  });
}

//================= SOCKET IO =================
socket.on('connect', function (data) {
  console.log('connected to socket');
  socket.emit('join', 'Server Connected to Client');
});

socket.on('messages', function (data) {
  console.log(data);
});

socket.on('message', (data) => {
  const chatwindow = document.getElementById('chat-window');
  if (chatwindow.lastElementChild.classList.contains('assistant-bubble')) {
    chatwindow.lastElementChild.innerText = chatwindow.lastElementChild.innerText + ' ' + data;
  } else {
    let bubble = document.createElement('div');
    bubble.classList.add('assistant-bubble');
    bubble.innerText = data;
    chatwindow.appendChild(bubble);
  }
  chatwindow.scrollTop = chatwindow.scrollHeight;
})

socket.on('addToQueue', (data) => {
  queue.push(data)
  checkqueue()
})

socket.on('speechData', function (data) {
  try {
    const resultText = document.getElementById('result');
    var dataFinal = undefined || data.results[0].isFinal;
  
    if (dataFinal === false) {
      if (removeLastSentence) {
        if (resultText.lastElementChild) {
          resultText.lastElementChild.remove();
        }
      }
      removeLastSentence = true;
  
  
      let empty = document.createElement('span');
      resultText.appendChild(empty);
  
      let edit = addTimeSettingsInterim(data);
  
      for (var i = 0; i < edit.length; i++) {
        resultText.lastElementChild.appendChild(edit[i]);
        resultText.lastElementChild.appendChild(
          document.createTextNode('\u00A0')
        );
      }
    } else if (dataFinal === true) {
      resultText.lastElementChild?.remove();
  
      //add empty span
      let empty = document.createElement('span');
      resultText.appendChild(empty);
  
      //add children to empty span
      let edit = addTimeSettingsFinal(data);
      for (var i = 0; i < edit.length; i++) {
        if (i === 0) {
          edit[i].innerText = capitalize(edit[i].innerText);
        }
        resultText.lastElementChild.appendChild(edit[i]);
  
        if (i !== edit.length - 1) {
          resultText.lastElementChild.appendChild(
            document.createTextNode('\u00A0')
          );
        }
      }
      resultText.lastElementChild.appendChild(
        document.createTextNode('\u002E\u00A0')
      );
  
      console.log("Google Speech sent 'final' Sentence.");
      finalWord = true;
      removeLastSentence = false;

      function getTranscription() {
        const resultDiv = document.getElementById('result');
        const spans = resultDiv.querySelectorAll('span');
        let transcription = '';
      
        spans.forEach(span => {
          transcription += span.textContent.trim() + ' ';
        });
        resultDiv.innerHTML = ''
        transcription = transcription.substring((transcription.length / 2), (transcription.length - 1))
        return transcription.trim();
      }

      if ( endtalking ) {
        clearTimeout(endtalking)
      }

      endtalking = setTimeout(() => {
        sendMessage(getTranscription())
        stopRecording()
      }, 1000)
    }
  } catch (e) {
    console.log(e);
    socket.emit('endGoogleCloudStream', '');
  }
});


function addTimeSettingsInterim(speechData) {
  let wholeString = speechData.results[0].alternatives[0].transcript;
  let words_without_time = wholeString.split(' ').map(word => {
    let newSpan = document.createElement('span');
    newSpan.innerHTML = word;
    return newSpan;
  });

  finalWord = false;

  return words_without_time;
}

function addTimeSettingsFinal(speechData) {
  let words = speechData.results[0].alternatives[0].words;
  let words_n_time = words.map(wordObj => {
    let newSpan = document.createElement('span');
    newSpan.innerHTML = wordObj.word;
    return newSpan;
  });

  return words_n_time;
}

window.onbeforeunload = function () {
  if (streamStreaming) {
    socket.emit('endGoogleCloudStream', '');
  }
};

//================= SANTAS HELPERS =================


function convertFloat32ToInt16(buffer) {
  let l = buffer.length;
  let buf = new Int16Array(l / 3);

  while (l--) {
    if (l % 3 == 0) {
      buf[l / 3] = buffer[l] * 0xffff;
    }
  }
  return buf.buffer;
}

function capitalize(s) {
  if (s.length < 1) {
    return s;
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}
