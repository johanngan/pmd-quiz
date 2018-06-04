// Helper functions //

// Loading
function loadJSON(path) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('GET', path);
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(xhr.status + ': ' + xhr.statusText);
    xhr.send();
  });
}

function displayError(error) {
    console.error(error);
}

// General
function randomArrayElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function subsStr(str, sub) {
    return str.replace(/%s/g, sub);
}


// Divides all the answers' point totals by a certain factor
function dividePoints(questions, factor) {
    for(let i = 0; i < questions.length; i++) {
        divideQuestionPoints(questions[i], factor);
    }
}

function divideQuestionPoints(question, factor) {
    for(let i = 0; i < question.answers.length; i++) {
        for(let j in question.answers[i].points) {
            question.answers[i].points[j] /= factor;
        }

        // Recursively divide scores for each subquestion
        if(question.answers[i].hasOwnProperty('subQuestion')) {
            divideQuestionPoints(question.answers[i].subQuestion, factor);
        }
    }
}

// Tags all the questions with some string
function tagQuestions(questions, tag) {
    for(let i = 0; i < questions.length; i++) {
        if(questions[i].hasOwnProperty('tags')) {
            questions[i].tags.add(tag);
        } else {
            questions[i].tags = new Set([tag]);
        }
    }
}

// Identifies and tags repeat questions in different lists by combining tags.
// Assumes no repeats internally within each list.
function identifyRepeatQuestions(questions1, questions2) {
    for(let i = 0; i < questions1.length; i++) {
        for(let j = 0; j < questions2.length; j++) {
            if(questions1[i].textValue === questions2[j].textValue) {
                combineTags(questions1[i], questions2[j]);
                break;
            }
        }
    }
}

// Set union
function union(setA, setB) {
    var _union = new Set(setA);
    for (var elem of setB) {
        _union.add(elem);
    }
    return _union;
}

// Combines question tags with repeat checking. Modifies both question1 and question2
function combineTags(question1, question2) {
    question1.tags = union(question1.tags, question2.tags);
    question2.tags = new Set(question1.tags);
}

// Concatenation with repeat checking
function concatQuestionLists(questions1, questions2) {
    var newQuestions = questions1.slice();  // Shallow copy, but not such a big deal
    for(let i = 0; i < questions2.length; i++) {
        let isRepeat = false;
        for(let j = 0; j < newQuestions.length; j++) {
            if(questions2[i].textValue === newQuestions[j].textValue) {
                isRepeat = true;
                break;
            }
        }

        if(!isRepeat) {
            newQuestions.push(questions2[i]);
        }
    }

    return newQuestions;
}

// Create an image from a filename stub
function createImg(filestub) {
    var img = document.createElement('img');
    img.src = 'images/' + filestub + '.png';
    // img.src = 'images/resources/super/' + filestub + '.png';
    img.classList.add('result');
    return img;
}

// Remove all results from the document
function clearResults() {
    results = document.querySelectorAll('.result');
    for(let i = 0; i < results.length; i++) {
        results[i].parentNode.removeChild(results[i]);
    }
}

// Sets the gender of relevant elements
function setGender(gender) {
    var colorables = document.querySelectorAll('.colorable');
    for(let i = 0; i < colorables.length; i++) {
        colorables[i].setAttribute('gender', gender);
    }
}

function unsetGender() {
    var colorables = document.querySelectorAll('.colorable');
    for(let i = 0; i < colorables.length; i++) {
        colorables[i].removeAttribute('gender');
    }
}