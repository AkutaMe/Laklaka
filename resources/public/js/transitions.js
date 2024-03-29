const chatbutton = document.getElementById("chat-button");
const testbutton = document.getElementById("test-button");
const backbutton = document.getElementById("back");
const homepage = document.getElementById("home");
const chatpage = document.getElementById("chat");
const testpage = document.getElementById("test-page");
const subjectpage = document.getElementById("subject-select");
const test = document.getElementById("test-container");

function hideAllPages() {
  homepage.style.display = "none";
  chatpage.style.display = "none";
  testpage.style.display = "none";
  subjectpage.style.display = "none";
  test.style.display = "none";
}

chatbutton.onclick = () => {
  hideAllPages();
  backbutton.style.display = "block";
  chatpage.style.display = "grid";
};
testbutton.onclick = () => {
  hideAllPages();
  backbutton.style.display = "block";
  testpage.style.display = "flex";
  subjectpage.style.display = "flex";
};
backbutton.onclick = () => {
  hideAllPages();
  backbutton.style.display = "none";
  homepage.style.display = "flex";
};

const selects = document.querySelectorAll('select')
for (let i = 0; i < selects.length; i++) {
    selects[i].addEventListener('change', (e) => {
        const select = e.target
        select.blur()
    })
}