async function generateSpeech(str, lang) {
    const axios = require('axios');
    const req = {
        method: 'POST',
        url: 'https://bff.listnr.tech/backend/ttsNewDemo',
        headers: {
          authority: 'bff.listnr.tech',
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en,en-US;q=0.9',
          'content-type': 'application/json',
          origin: 'https://listnr.ai',
          referer: 'https://listnr.ai/',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        data: {
          ttsService: 'azure',
          audioKey: '62cc2f1bff7e29001da9e18c',
          storageService: 's3',
          text: `<speak><p>${str}</p></speak>`,
          wordCount: 8,
          voice: { value: `${lang}-EkaNeural`, lang },
          audioOutput: { fileFormat: 'mp3', sampleRate: 24000 }
        }
    };
    const res = await axios(req);
    const url = res.data.url;
    let audioData = await axios.get(url, { responseType: 'arraybuffer' });
    audioData = Buffer.from(audioData.data)
    return audioData;
}

module.exports = { generateSpeech }