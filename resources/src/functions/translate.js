const axios = require("axios");

async function translate(text, from, to) {
  const req = {
    data: {
      from,
      to,
      text,
    },
    method: "POST",
    url: "https://google-translate113.p.rapidapi.com/api/v1/translator/text",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "X-RapidAPI-Key": "c7f6a9858fmsh4c85ce36d897f68p1d739cjsn07ca09051a71",
      "X-RapidAPI-Host": "google-translate113.p.rapidapi.com",
    },
  };
  const res = await axios(req);
  return res.data.trans;
}

module.exports = { translate };
