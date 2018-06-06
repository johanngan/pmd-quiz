// Display objects
var activeQuestion = document.querySelector('.question');
var answerList = document.querySelector('.answer-list');
var menuBar = document.querySelector('.menu-bar');
var progress = document.querySelector('.progress');

// Synthesize navigation control buttons
var navButtons = document.querySelector('.nav-buttons');

var previousButton = document.createElement('button');
previousButton.id = 'previous';
previousButton.innerHTML = '<span class="arrow">◄</span>Prev';

var nextButton = document.createElement('button');
nextButton.id = 'next';
nextButton.innerHTML = 'Next<span class="arrow">►</span>';

var restartButton = document.createElement('button');
restartButton.id = 'restart';
restartButton.textContent = 'Restart';

var upButton = document.createElement('button');
upButton.id = 'up';
upButton.textContent = '⇧';

// Flag set to true during the main quiz
var takingQuiz = false;

// Helpers for modifying the answer list

function addAnswer(answerText, id, clickHandler, state=null) {
    var newAnswer = document.createElement('li');
    newAnswer.setAttribute('id', id);
    newAnswer.textContent = answerText;
    newAnswer.addEventListener('click', clickHandler);

    if(state !== null) {
        newAnswer.classList.add(state);
    }
    
    answerList.appendChild(newAnswer);
}

function clearAnswers() {
    while(answerList.firstChild) {
        answerList.removeChild(answerList.firstChild);
    }
}

// Helper for controlling progress indicator
function removeElement(sel) {
    var e = document.querySelector(sel);
    if(e) {
        e.parentNode.removeChild(e);
    }
}

var setProgress = function(str) {
    progress.textContent = str;
}

var showProgress = function() {
    var p = document.querySelector('.progress');
    if(!p) {
        menuBar.appendChild(progress);
    }
}
var hideProgress = function() {
    removeElement('.progress');
}

// Helpers for controlling the navigation bar items
var showArrows = function() {
    var left = document.querySelector('#previous');
    if(!left) {
        navButtons.insertBefore(previousButton, navButtons.firstChild);
    }

    var right = document.querySelector('#next');
    if(!right) {
        navButtons.insertBefore(nextButton, previousButton.nextSibling);
    }
}
var hideArrows = function() {
    removeElement('#previous');
    removeElement('#next');
}
var enableLeftArrow = function() {
    previousButton.classList.remove('disabled');
}
var disableLeftArrow = function() {
    previousButton.classList.add('disabled');
}
var enableRightArrow = function() {
    nextButton.classList.remove('disabled');
}
var disableRightArrow = function() {
    nextButton.classList.add('disabled');
}
var enableArrows = function() {
    enableLeftArrow();
    enableRightArrow();
}
var disableArrows = function() {
    disableLeftArrow();
    disableRightArrow();
}

var showRestart = function() {
    var u = document.querySelector('#up');
    var r = document.querySelector('#restart');
    if(!r) {
        if(!u) {
            navButtons.appendChild(restartButton);
        } else {
            navButtons.insertBefore(restartButton, upButton);
        }
    }
}
var hideRestart = function() {
    removeElement('#restart');
}

var showUp = function() {
    var u = document.querySelector('#up');
    if(!u) {
        navButtons.appendChild(upButton);
    }
}
var hideUp = function() {
    removeElement('#up');
}


// Pure presenter definition/implementation -- no possibility for user response
function PurePresenter() {
    this.questions = [];        // List of string values to present
    this.currentQuestion = 0;   // Index of the current "question" (string)
    this.cyclicPresentation = false; // If false, the next/previous buttons will be disabled at the last/first questions
    this.setup = function() {};
    this.finalize = function() {};
}

PurePresenter.prototype.addQuestion = function(question) {
    this.questions.push(question);
}

PurePresenter.prototype.addQuestionList = function(questions) {
    for(i = 0; i < questions.length; i++) {
        this.addQuestion(questions[i]);
    }
}

PurePresenter.prototype.clearQuestions = function() {
    this.questions = [];
}

PurePresenter.prototype.startPresenting = function() {
    this.setup();   // Perform unique initial setup for the quiz
    currentPresenter = this;

    if(this.questions.length > 0) {
        this.presentQuestionAtIndex(0);
    } else {
        this.finalize();
    }
}

PurePresenter.prototype.presentQuestionAtIndex = function(index) {
    if(index < this.questions.length - 1) {
        this.currentQuestion = index;
        if(!this.cyclicPresentation) {
            enableRightArrow();
            if(this.currentQuestion <= 0) {
                disableLeftArrow();
            } else {
                enableLeftArrow();
            }
        }

        this.presentQuestion(this.questions[index]);
    } else {
        this.currentQuestion = this.questions.length - 1;
        if(!this.cyclicPresentation) {
            disableRightArrow();
            if(this.currentQuestion <= 0) {
                disableLeftArrow();
            } else {
                enableLeftArrow();
            }
        }
        this.finalize();
    }
}

// Set up the pretty presentation and event handlers
PurePresenter.prototype.presentQuestion = function(question) {
    activeQuestion.textContent = question;
    clearAnswers();
}

// Get the next question
PurePresenter.prototype.nextQuestion = function() {
    if(this.questions.length === 0) {
        return null;
    }

    return (this.currentQuestion + 1) % this.questions.length;
}

// Get the previous question
PurePresenter.prototype.previousQuestion = function() {
    if(this.questions.length === 0) {
        return null;
    }

    if(this.currentQuestion > 0) {
        return this.currentQuestion - 1;
    } else {
        return this.questions.length - 1 + this.currentQuestion % this.questions.length;
    }
}

PurePresenter.prototype.reset = function() {
    this.currentQuestion = 0;
}




// Presenter class definition/implementation
function Presenter() {
    PurePresenter.call(this);
    this.cyclicPresentation = false; // If true, the "next" button on the last question will wrap to the first, and vice versa.

    this.subQuestionLevel = 0;
    this.responses = [];        // List of answer objects corresponding to the response the user chose for each question
    this.subQuestionResponses = [];
    this.unanswered = [];       // List of indices of the unanswered questions
    this.progressString = () => this.currentQuestion+1
        + (this.subQuestionLevel > 0 ? String.fromCharCode('a'.charCodeAt(0) + this.subQuestionLevel) : '')
        + '/' + this.questions.length;
}
Presenter.prototype = Object.create(PurePresenter.prototype);
Presenter.prototype.constructor = Presenter;

Presenter.prototype.addQuestion = function(question) {
    Object.getPrototypeOf(Presenter.prototype).addQuestion.call(this, question);

    this.responses.push(null);
    this.subQuestionResponses.push([]);
    this.unanswered.push(this.questions.length-1);
}

Presenter.prototype.clearQuestions = function() {
    Object.getPrototypeOf(Presenter.prototype).clearQuestions.call(this);

    this.responses = [];
    this.subQuestionResponses = [];
    this.unanswered = [];
}

// Splices off questions from index and returns the spliced responses only
Presenter.prototype.spliceResponses = function(index) {
    this.questions.splice(index);
    this.subQuestionResponses.splice(index);
    var toRemove = this.unanswered.findIndex(element => element >= index);
    while(toRemove !== -1) {
        this.unanswered.splice(toRemove, 1);
        toRemove = this.unanswered.findIndex(element => element >= index);
    }

    return this.responses.splice(index);
}

Presenter.prototype.presentQuestionAtIndex = function(index, subQuestionLevel=0) {
    if(index !== null) {
        this.subQuestionLevel = Math.min(subQuestionLevel, this.subQuestionResponses.length);
        this.currentQuestion = index;
        if(!this.cyclicPresentation) {
            if(this.currentQuestion <= 0) {
                disableLeftArrow();
            } else {
                enableLeftArrow();
            }

            if(this.currentQuestion >= this.questions.length - 1) {
                disableRightArrow();
            } else {
                enableRightArrow();
            }
        }

        var question = this.questions[index];
        var response = this.responses[index];
        if(this.subQuestionResponses[index].length > 0) {
            if(this.subQuestionLevel > 0) {
                if(this.subQuestionResponses[index][this.subQuestionLevel-1].hasOwnProperty('subQuestion')) {
                    question = this.subQuestionResponses[index][this.subQuestionLevel-1].subQuestion;
                } else if(this.subQuestionLevel > 1) {
                    question = this.subQuestionResponses[index][this.subQuestionLevel-2].subQuestion;
                    this.subQuestionLevel--;
                }
            }

            response = this.subQuestionResponses[index][this.subQuestionLevel];
        }

        this.presentQuestion(question, response, this.subQuestionLevel);
    } else {
        this.finalize();
    }
}

// Set up the pretty presentation and event handlers
Presenter.prototype.presentQuestion = function(question, response=null, subQuestionLevel=0) {
    activeQuestion.textContent = question.textValue;
    clearAnswers();
    this.subQuestionLevel = subQuestionLevel;
    setProgress(this.progressString());

    if(subQuestionLevel > 0) {
        showUp();
    } else {
        hideUp();
    }

    var _this = this;
    for(let i = 0; i < question.answers.length; i++) {
        let handler;
        if(question.answers[i].hasOwnProperty('subQuestion')) {
            handler = function(e) {
                var responseID = Number(e.target.id);

                // If the old answer doesn't exist or doesn't match the new answer, remove everything from then on
                // and add the new answer. If not, make no changes
                if(_this.subQuestionResponses[_this.currentQuestion].length > subQuestionLevel &&
                    _this.subQuestionResponses[_this.currentQuestion][subQuestionLevel].textValue !==
                    question.answers[responseID].textValue) {
                    _this.subQuestionResponses[_this.currentQuestion].splice(subQuestionLevel);
                }
                if(_this.subQuestionResponses[_this.currentQuestion].length <= subQuestionLevel) {
                    _this.responses[_this.currentQuestion] = question.answers[responseID];
                    _this.subQuestionResponses[_this.currentQuestion].push(question.answers[responseID]);

                    // If the question is answered and something has changed, make it unanswered if the response is incomplete
                    var unansweredIndex = _this.unanswered.indexOf(_this.currentQuestion);
                    if(unansweredIndex === -1 && question.answers[responseID].hasOwnProperty('subQuestion')) {
                        let nextIndex = _this.unanswered.findIndex(element => element > _this.currentQuestion);
                        if(nextIndex === -1) {
                            _this.unanswered.push(_this.currentQuestion);
                        } else {
                            _this.unanswered.splice(nextIndex, 0, _this.currentQuestion);
                        }
                    }
                }
                
                var nextResponse = null;
                if(_this.subQuestionResponses[_this.currentQuestion].length > subQuestionLevel+1) {
                    nextResponse = _this.subQuestionResponses[_this.currentQuestion][subQuestionLevel+1];
                }
                _this.presentQuestion(question.answers[i].subQuestion, nextResponse, subQuestionLevel+1);
            }
        } else {
            handler = function(e) {
                var responseID = Number(e.target.id);
                _this.responses[_this.currentQuestion] = question.answers[responseID];
                // Add to the subquestion answer list if in subquestion-land. If not, Make sure the list is empty.
                if(subQuestionLevel > 0) {
                    _this.subQuestionResponses[_this.currentQuestion].splice(subQuestionLevel);
                    _this.subQuestionResponses[_this.currentQuestion].push(question.answers[responseID]);
                } else {
                    _this.subQuestionResponses[_this.currentQuestion] = [];
                }
                var unansweredIndex = _this.unanswered.indexOf(_this.currentQuestion);
                if(unansweredIndex !== -1) {
                    _this.unanswered.splice(unansweredIndex, 1);
                }
                _this.presentQuestionAtIndex(_this.nextUnansweredQuestion());
            }
        }
        let state = null;
        if(response !== null && response.textValue === question.answers[i].textValue) {
            if(this.responses[this.currentQuestion].hasOwnProperty('subQuestion')) {
                state = 'incomplete'
            } else {
                state = 'selected';
            }
        }

        addAnswer(question.answers[i].textValue, i, handler, state);
    }
}

// Get the next question index in line yet to be answered
Presenter.prototype.nextUnansweredQuestion = function() {
    if(this.unanswered.length === 0) {
        return null;
    }

    if(this.currentQuestion > this.unanswered[this.unanswered.length-1]) {
        return this.unanswered[0];
    }

    var _this = this;
    return this.unanswered.find(
        function(element) {
            return element > _this.currentQuestion;
        }
    )
}

Presenter.prototype.reset = function() {
    Object.getPrototypeOf(Presenter.prototype).reset.call(this);

    this.subQuestionLevel = 0;
    this.responses = [];
    this.subQuestionResponses = [];
    this.unanswered = [];

    for(let i = 0; i < this.questions.length; i++) {
        this.responses.push(null);
        this.subQuestionResponses.push([]);
        this.unanswered.push(i);
    }
}