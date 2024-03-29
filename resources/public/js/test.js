const submitbutton = document.getElementById("subject-submit");
const subjectinput = document.getElementById("subject");
const loading = document.getElementById("test-loading");
const amoutinput = document.getElementById("amount");
const leftcontainer = document.getElementById("left-container");
const rightcontainer = document.getElementById("right-container");
const testcontainer = document.getElementById("test-container");
const difficultyselect = document.getElementById("difficulty");
const correcttest = document.getElementById("correct-test");

const difficulties = ["Easy", "Medium", "Hard"];

let id = "";

submitbutton.addEventListener("click", async (e) => {
  e.preventDefault();
  const subject = subjectinput.value;
  const amount = amoutinput.value;
  const difficultyidx = difficultyselect.selectedIndex;
  const difficulty = difficulties[difficultyidx];
  loading.style.display = "flex";
  subjectpage.style.display = "none";
  const req = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      questions: amount,
      difficulty,
    }),
  };
  const res = await fetch("http://localhost:1337/generate-test", req);
  const { test, id: testid } = await res.json();
  id = testid;
  console.log(test);
  // const test = [ { type: "select", question: "What's 1+1", enum: [ "1", "2", "3", "4" ] }, { type: "text", question: "What is the square root of 121?" } ]
  loading.style.display = "none";
  for (let i = 0; i < test.length; i++) {
    const question = test[i];
    if (question.type === "select") {
      const select = document.createElement("select");
      select.setAttribute("id", `q-${i}`);
      select.setAttribute("name", `q-${i}`);
      select.setAttribute("class", "select-q");
      select.setAttribute("required", "");
      for (let j = 0; j < question.enum.length; j++) {
        const option = document.createElement("option");
        option.setAttribute("value", question.enum[j]);
        option.innerHTML = question.enum[j];
        select.appendChild(option);
      }
      const label = document.createElement("label");
      label.setAttribute("for", `q-${i}`);
      label.innerHTML = question.question;
      if (i % 2 === 0) {
        leftcontainer.appendChild(label);
        leftcontainer.appendChild(select);
      } else {
        rightcontainer.appendChild(label);
        rightcontainer.appendChild(select);
      }
    } else {
      const input = document.createElement("input");
      input.setAttribute("id", `q-${i}`);
      input.setAttribute("name", `q-${i}`);
      input.setAttribute("placeholder", `ჩაწერე თქვენი პასუხი აქ...`);
      input.setAttribute("type", "text");
      input.setAttribute("required", "");
      const label = document.createElement("label");
      label.setAttribute("for", `q-${i}`);
      label.innerHTML = question.question;
      if (i % 2 === 0) {
        leftcontainer.appendChild(label);
        leftcontainer.appendChild(input);
      } else {
        rightcontainer.appendChild(label);
        rightcontainer.appendChild(input);
      }
    }
  }
  testcontainer.style.display = "flex";
  const selects = document.querySelectorAll("select");
  for (let i = 0; i < selects.length; i++) {
    selects[i].addEventListener("change", (e) => {
      const select = e.target;
      select.blur();
    });
  }
});

correcttest.addEventListener("click", async (e) => {
  loading.style.display = "flex";
  testcontainer.style.display = "none";
  correcttest.style.display = "none";
  let ansl = [];
  let ansr = [];
  let ql = [];
  let qr = [];
  for (let i = leftcontainer.childNodes.length - 1; i >= 0; i--) {
    let child = leftcontainer.childNodes[i];
    if (child.nodeName === "INPUT") {
      if (child.value) {
        ansl.push(child.value);
      }
      child.remove();
    }
    if (child.nodeName === "SELECT") {
      if (child.value) {
        ansl.push(child.value);
      }
      child.remove();
    }
    if (child.nodeName === "LABEL") {
      if (child.innerHTML) {
        ql.push(child.innerHTML);
      }
      child.remove();
    }
  }

  for (let i = rightcontainer.childNodes.length - 1; i >= 0; i--) {
    let child = rightcontainer.childNodes[i];
    if (child.nodeName === "INPUT") {
      if (child.value) {
        ansr.push(child.value);
      }
      child.remove();
    }
    if (child.nodeName === "SELECT") {
      if (child.value) {
        ansr.push(child.value);
      }
      child.remove();
    }
    if (child.nodeName === "LABEL") {
      if (child.innerHTML) {
        qr.push(child.innerHTML);
      }
      child.remove();
    }
  }
  console.log(ansl);
  console.log(ansr);
  console.log(ql);
  console.log(qr);
  let answers = ansl.map((item, index) => [item, ansr[index]]).flat();
  let questions = ql.map((item, index) => [item, qr[index]]).flat();
  answers.pop();
  questions.pop();
  answers = answers.reverse();
  questions = questions.reverse();
  console.log(questions);
  console.log(answers);
  const req = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ answers, id }),
  };
  const res = await fetch("http://localhost:1337/correct-test", req);
  const { correction } = await res.json();
  console.log(correction);

  for (let i = 0; i < correction.length; i++) {
    const answer = correction[i];
    const correct = answer.correct;
    const correct_answer = answer.correct_answer;
    const explanation = answer.explanation;
    if (correct) {
      const label = document.createElement("b");
      label.innerText = questions[i];
      const input = document.createElement("input");
      input.className = "correct";
      input.value = answers[i];
      input.disabled = true;
      const p = document.createElement("p");
      p.innerText = `სწორია!`;
      p.className = "right8";
      if (i % 2 === 0) {
        leftcontainer.appendChild(label);
        leftcontainer.appendChild(input);
        leftcontainer.appendChild(p);
      } else {
        rightcontainer.appendChild(label);
        rightcontainer.appendChild(input);
        rightcontainer.appendChild(p);
      }
    } else {
      const label = document.createElement("b");
      label.innerText = questions[i];
      const input = document.createElement("input");
      input.className = "wrong";
      input.value = answers[i];
      input.disabled = true;
      const p = document.createElement("p");
      p.innerText = `სწორი პასუხია: ${correct_answer}`;
      const explain = document.createElement("p");
      explain.innerText = explanation;
      if (i % 2 === 0) {
        leftcontainer.appendChild(label);
        leftcontainer.appendChild(input);
        leftcontainer.appendChild(p);
        leftcontainer.appendChild(explain);
      } else {
        rightcontainer.appendChild(label);
        rightcontainer.appendChild(input);
        rightcontainer.appendChild(p);
        rightcontainer.appendChild(explain);
      }
    }
  }
  loading.style.display = "none";
  testcontainer.style.display = "flex";
});
