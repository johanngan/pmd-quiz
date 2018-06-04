// Display objects
var activeQuestion = document.querySelector('.question');
var answerList = document.querySelector('.answer-list');
var menuBar = document.querySelector('.menu-bar');
var progress = document.querySelector('.progress');

// Navigation control buttons
var navButtons = document.querySelector('.nav-buttons');
var previousButton = document.querySelector('#previous');
var nextButton = document.querySelector('#next');
var restartButton = document.querySelector('#restart');

// Flag set to true during the main quiz
var takingQuiz = false;

// Helpers for modifying the answer list

function addAnswer(answerText, id, clickHandler, selected=false) {
    var newAnswer = document.createElement('li');
    newAnswer.setAttribute('id', id);
    newAnswer.textContent = answerText;
    newAnswer.addEventListener('click', clickHandler);

    if(selected) {
        newAnswer.classList.add('selected');
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
    var r = document.querySelector('#restart');
    if(!r) {
        navButtons.appendChild(restartButton);
    }
}
var hideRestart = function() {
    removeElement('#restart');
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
    this.cyclicPresentation = true; // If true, the "next" button on the last question will wrap to the first, and vice versa.

    this.subQuestionLevel = 0;
    this.responses = [];        // List of answer objects corresponding to the response the user chose for each question
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
    this.unanswered.push(this.questions.length-1);
}

Presenter.prototype.clearQuestions = function() {
    Object.getPrototypeOf(Presenter.prototype).clearQuestions.call(this);

    this.responses = [];
    this.unanswered = [];
}

Presenter.prototype.presentQuestionAtIndex = function(index) {
    if(index !== null) {
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

        setProgress(this.progressString());
        this.presentQuestion(this.questions[index], this.responses[index]);
    } else {
        this.finalize();
    }
}

// Set up the pretty presentation and event handlers
Presenter.prototype.presentQuestion = function(question, response=null) {
    activeQuestion.textContent = question.textValue;
    clearAnswers();

    var _this = this;
    for(let i = 0; i < question.answers.length; i++) {
        // var handler;
        // if(question.answers[i].hasOwnProperty('subQuestion')) {
        //     handler = function(e) {
        //         _this.subQuestionLevel++;
        //         _this.presentQuestion(question.answers[i].subQuestion);
        //     }
        // } else {
        //     handler = function(e) {
        //         var responseID = Number(e.target.id);
        //         console.log('Response: ' + responseID);
        //         // 1. lock the list elements from further interaction??? TODO
        //         // 2. record the answer
        //         _this.responses[_this.currentQuestion] = _this.questions[_this.currentQuestion].answers[responseID];
        //         // // 3. Perform custom handling -- UNNEEDED?
        //         // question.handleResponse(e.target.id);
        //         // 4. Set this question as answered
        //         var unansweredIndex = _this.unanswered.indexOf(_this.currentQuestion);
        //         if(unansweredIndex !== -1) {
        //             _this.unanswered.splice(unansweredIndex, 1);
        //         }
        //         // 5. present the next question
        //         _this.presentQuestionAtIndex(_this.nextUnansweredQuestion());
        //     }
        // }
        let selected = false;
        if(response !== null) {
            if(response.textValue === question.answers[i].textValue) {
                selected = true;
            }
        }

        addAnswer(question.answers[i].textValue, i,
            function(e) {
                var responseID = Number(e.target.id);
                // 1. lock the list elements from further interaction??? TODO
                // 2. record the answer
                _this.responses[_this.currentQuestion] = _this.questions[_this.currentQuestion].answers[responseID];
                // // 3. Perform custom handling -- UNNEEDED?
                // question.handleResponse(e.target.id);
                // 4. Set this question as answered
                var unansweredIndex = _this.unanswered.indexOf(_this.currentQuestion);
                if(unansweredIndex !== -1) {
                    _this.unanswered.splice(unansweredIndex, 1);
                }
                // 5. present the next question
                _this.presentQuestionAtIndex(_this.nextUnansweredQuestion());
            },
            selected
        );
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
    this.unanswered = [];

    for(let i = 0; i < this.questions.length; i++) {
        this.responses.push(null);
        this.unanswered.push(i);
    }
}