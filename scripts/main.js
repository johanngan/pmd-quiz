var dialogBox = document.querySelector('.dialog-box')
var main = document.querySelector('main');

// Read in the data
var setupQuestions;
var pmd1Questions;
var pmd2TDQuestions;
var pmd2SQuestions;
var mainQuestions;      // Set after game choice is made. Either pmd1, pmd2TD, pmd2S, or aggregated
var finalQuestions;

var pmd1Descriptions;
var pmd2Descriptions;

var pmd1Starters;
var pmd2TDStarters;
var pmd2SStarters;

const setupQuestionsLoaded = loadJSON('data/setupQuestions.json').then(result => {setupQuestions = result;}, displayError);
// Tag the questions for identification purposes later.
const pmd1QuestionsLoaded = loadJSON('data/pmd1Questions.json').then(
    result => {
        pmd1Questions = result;
        tagQuestions(pmd1Questions, 'PMD1');
    }, displayError);
// Divide all T/D point values by 2 to be more commensurate in magnitude with the other two games' point values.
const pmd2TDQuestionsLoaded = loadJSON('data/pmd2TDQuestions.json').then(
    result => {
        pmd2TDQuestions = result;
        tagQuestions(pmd2TDQuestions, 'PMD2');
        tagQuestions(pmd2TDQuestions, 'Time/Darkness');
        dividePoints(pmd2TDQuestions, 2);
    }, displayError);
const pmd2SQuestionsLoaded = loadJSON('data/pmd2SQuestions.json').then(
    result => {
        pmd2SQuestions = result;
        tagQuestions(pmd2SQuestions, 'PMD2');
        tagQuestions(pmd2SQuestions, 'Sky');
    }, displayError);
const finalQuestionsLoaded = loadJSON('data/finalQuestions.json').then(result => {finalQuestions = result;}, displayError);
const pmd1DescriptionsLoaded = loadJSON('data/pmd1Descriptions.json').then(result => {pmd1Descriptions = result;}, displayError);
const pmd2DescriptionsLoaded = loadJSON('data/pmd2Descriptions.json').then(result => {pmd2Descriptions = result;}, displayError);
const pmd1StartersLoaded = loadJSON('data/pmd1Starters.json').then(result => {pmd1Starters = result;}, displayError);
const pmd2TDStartersLoaded = loadJSON('data/pmd2TDStarters.json').then(result => {pmd2TDStarters = result;}, displayError);
const pmd2SStartersLoaded = loadJSON('data/pmd2SStarters.json').then(result => {pmd2SStarters = result;}, displayError);

// Tag repeats with both individual tags
const mainQuestionsLoaded = Promise.all([
    pmd1QuestionsLoaded,
    pmd2TDQuestionsLoaded,
    pmd2SQuestionsLoaded])
.then(
    function(_) {
        identifyRepeatQuestions(pmd1Questions, pmd2TDQuestions);
        identifyRepeatQuestions(pmd1Questions, pmd2SQuestions);
        identifyRepeatQuestions(pmd2TDQuestions, pmd2SQuestions);
    }
);


// Create the presenters
var gameSelector = new Presenter();
var quizLengthSelector = new Presenter();
var mainPresenter = new Presenter();
var genderSelector = new Presenter();
var descriptionPresenter = new PurePresenter();
var presenterList = [gameSelector, quizLengthSelector, mainPresenter, genderSelector, descriptionPresenter];  // Convenience

var currentPresenter;   // Will contain the presenter currently presenting questions.

// Array to hold the final nature scores/stats.
var scoresByGame = [];
var natureScoreList = [];

// Warning if leaving while taking the quiz
window.onload = function() {
    window.addEventListener('beforeunload', function(e) {
        if(!takingQuiz) {
            return undefined;
        }

        var confirmation = "You're in the middle of taking the quiz! Your progress will be lost if you leave.";
        (e || window.event).returnValue = confirmation; // Gecko + IE
        return confirmation; // Gecko + Webkit, Safari, Chrome etc.
    });
};



// Reset answers of all the presenters and start from the beginning
var restartQuiz = function() {
    clearResults();
    takingQuiz = false;

    for(let i = 0; i < presenterList.length; i++) {
        presenterList[i].reset();
    }

    sortedKeys = [];
    sortedScores = [];

    presenterList[0].startPresenting();
}

// Set navigation button event handlers
restartButton.addEventListener('click', function(e) {
    var confirmed = true;
    if(takingQuiz) {
        confirmed = myConfirm("Are you sure you want to restart? Your progress will not be saved.");
    }

    if(confirmed) {
        restartQuiz();
    }
});

// https://stackoverflow.com/questions/11571015/how-to-detect-prevent-this-page-from-creating-additional-dialogs
function myConfirm(message){
    var start = new Date().getTime();
    var result = confirm(message);
    var dt = new Date().getTime() - start;
    // dt < 50ms means probable computer
    // the quickest I could get while expecting the popup was 100ms
    // slowest I got from computer suppression was 20ms
    for(var i=0; i < 10 && !result && dt < 50; i++){
        start = new Date().getTime();
        result = confirm(message);
        dt = new Date().getTime() - start;
    }
    if(dt < 50)
       return true;
    return result;
}

previousButton.addEventListener('click', function(e) {
    currentPresenter.presentQuestionAtIndex(currentPresenter.previousQuestion());
});
nextButton.addEventListener('click', function(e) {
    currentPresenter.presentQuestionAtIndex(currentPresenter.nextQuestion());
});



// Set up the presenters
var performSetup = function() {
    var initialSettingsBlurb = 'First, some settings...';

    gameSelector.clearQuestions();
    gameSelector.progressString = () => initialSettingsBlurb;
    gameSelector.addQuestion(setupQuestions[0]);
    gameSelector.setup = () => { hideArrows(); hideRestart(); showProgress(); };
    gameSelector.finalize = function() {
        // Set mainQuestions
        switch(gameSelector.responses[0].game) {
            case 'PMD1':
                mainQuestions = pmd1Questions;
                break;
            case 'PMD2:TD':
                mainQuestions = pmd2TDQuestions;
                break;
            case 'PMD2:S':
                mainQuestions = pmd2SQuestions;
                break;
            case 'PMD2':
                // mainQuestions = pmd2TDQuestions.concat(pmd2SQuestions); // Write something to merge these without repeats
                mainQuestions = concatQuestionLists(pmd2TDQuestions, pmd2SQuestions);
                break;
            case 'PMD1+PMD2':
                // mainQuestions = pmd1Questions.concat(pmd2TDQuestions).concat(pmd2SQuestions); // Write something to merge these without repeats
                mainQuestions = concatQuestionLists(concatQuestionLists(pmd1Questions, pmd2TDQuestions), pmd2SQuestions);
                break;
            default:
                console.error('gameSelector.finalize: something went wrong.');

        }

        // Reset the quizLengthSelector to template format using a deep copy
        quizLengthSelector.clearQuestions();
        var lengthQuestionCopy = {
            'textValue': setupQuestions[1].textValue,
            'answers': []
        };
        for(let i = 0; i < setupQuestions[1].answers.length; i++) {
            lengthQuestionCopy.answers.push({
                'textValue': setupQuestions[1].answers[i].textValue,
                'lengthValue': setupQuestions[1].answers[i].lengthValue
            })
        }
        quizLengthSelector.addQuestion(lengthQuestionCopy);

        // Substitute the length values into the quizLengthSelector answers' textValues
        for(let i = 0; i < quizLengthSelector.questions[0].answers.length; i++) {
            if(quizLengthSelector.questions[0].answers[i].lengthValue === 'all') {
                quizLengthSelector.questions[0].answers[i].lengthValue = mainQuestions.length;
            }

            quizLengthSelector.questions[0].answers[i].textValue = subsStr(
                quizLengthSelector.questions[0].answers[i].textValue,
                quizLengthSelector.questions[0].answers[i].lengthValue);
        }

        quizLengthSelector.startPresenting();
    }

    quizLengthSelector.progressString = () => initialSettingsBlurb;
    quizLengthSelector.setup = () => { hideArrows(); showRestart(); showProgress(); };
    quizLengthSelector.finalize = function() {
        mainPresenter.clearQuestions();

        // Add questions in random order without repeats.
        var available = [];
        for(let i = 0; i < mainQuestions.length; i++) {
            available.push(i);
        }
        for(let i = 0; i < Math.min(quizLengthSelector.responses[0].lengthValue, mainQuestions.length); i++) {
            let randI = Math.floor(Math.random() * available.length);
            mainPresenter.addQuestion(mainQuestions[available[randI]]);
            available.splice(randI, 1);
        }

        mainPresenter.startPresenting();
    }


    mainPresenter.setup = function() {
        takingQuiz = true;
        showArrows();
        enableArrows();
        showRestart();
        showProgress();
    }
    mainPresenter.finalize = function() {
        genderSelector.startPresenting();
    }

    genderSelector.clearQuestions();
    genderSelector.addQuestionList(finalQuestions);
    genderSelector.setup = () => { hideArrows(); showRestart(); hideProgress(); };
    genderSelector.finalize = function() {
        // Calculate scores by nature by game
        scoresByGame = tallyResults(mainPresenter.questions, mainPresenter.responses);
        natureScoreList = convertToNatureScoreList(scoresByGame);

        console.log(scoresByGame);
        console.log(natureScoreList);

        var descriptions;
        switch(gameSelector.responses[0].game) {
            case 'PMD1':
                descriptions = pmd1Descriptions;
                break;
            case 'PMD2:TD':
            case 'PMD2:S':
            case 'PMD2':
                descriptions = pmd2Descriptions;
                break;
            case 'PMD1+PMD2':
                if(selectBestGame(natureScoreList[0], ['pmd1', 'pmd2TD', 'pmd2S']) === 'pmd1') {
                    descriptions = pmd1Descriptions;
                } else {
                    descriptions = pmd2Descriptions;
                }
                break;
            default:
                console.error('genderSelector.finalize: something went wrong with game selection.');
        }

        descriptionPresenter.clearQuestions();
        descriptionPresenter.addQuestionList(descriptions[natureScoreList[0].nature]);  // TODO: soft-code the game choice
        descriptionPresenter.startPresenting();

        // display results from mainPresenter based on answers of mainPresenter and finalPresenter
        // also add button prompting user to restart the quiz (different entity than restart button during quiz)
    }

    descriptionPresenter.setup = () => { showArrows(); enableArrows(); showRestart(); hideProgress(); };
    descriptionPresenter.finalize = function() {
        takingQuiz = false;
        var loadingString = 'Calculating results. Please wait...';
        descriptionPresenter.presentQuestion(loadingString);

        // Decide the game for the purposes of the starter verdict
        var starters;
        var otherStarters = [];
        switch(gameSelector.responses[0].game) {
            case 'PMD1':
                starters = pmd1Starters;
                break;
            case 'PMD2:TD':
                starters = pmd2TDStarters;
                break;
            case 'PMD2:S':
                starters = pmd2SStarters;
                break;
            case 'PMD2':
                if(selectBestGame(natureScoreList[0], ['pmd2TD', 'pmd2S']) === 'pmd2TD') {
                    starters = pmd2TDStarters;
                    otherStarters.push(pmd2SStarters);
                } else {
                    starters = pmd2SStarters;
                    otherStarters.push(pmd2TDStarters);
                }
                break;
            case 'PMD1+PMD2':
                let bestGame = selectBestGame(natureScoreList[0], ['pmd1', 'pmd2TD', 'pmd2S']);
                if(bestGame === 'pmd1') {
                    starters = pmd1Starters;
                    otherStarters.push(pmd2TDStarters);
                    otherStarters.push(pmd2SStarters);
                } else if(bestGame === 'pmd2TD') {
                    starters = pmd2TDStarters;
                    otherStarters.push(pmd1Starters);
                    otherStarters.push(pmd2SStarters);
                } else {
                    starters = pmd2SStarters;
                    otherStarters.push(pmd1Starters);
                    otherStarters.push(pmd2TDStarters);
                }
                break;
            default:
                console.error('descriptionPresenter.finalize: something went wrong with game selection.');
        }

        // Decide the gender for the purposes of the starter verdict
        var genderChoice;
        var possibleGenders;
        switch(genderSelector.responses[0].textValue) {
            case 'Male.':
                genderChoice = 'Male';
                possibleGenders = ['Male'];
                break;
            case 'Female.':
                genderChoice = 'Female';
                possibleGenders = ['Female'];
                break;
            case 'Neither.':
                possibleGenders = ['Male', 'Female'];
                genderChoice = randomArrayElement(possibleGenders);
                break;
            default:
                console.error('descriptorPresenter.finalize: something went wrong with gender selection.');
        }

        var pokemon = starters[natureScoreList[0].nature][genderChoice];
        var verdictStr = subsStr(descriptionPresenter.questions[descriptionPresenter.questions.length-1], pokemon);
        descriptionPresenter.presentQuestion(verdictStr);
        disableArrows();

        // Show the portrait of the chosen starter
        var portrait = createImg(pokemon + '-big');
        dialogBox.insertBefore(portrait, dialogBox.firstChild);

        // Show other possible starters of the chosen nature
        if(otherStarters.length > 0) {
            let genderSymbol = '';
            if(possibleGenders.length === 1) {
                if(genderChoice === 'Male') {
                    genderSymbol = ' (♂) ';
                } else {
                    genderSymbol = ' (♀) '
                }
            }

            var includedStarters = [pokemon];
            var othersDisplay = document.createElement('div');
            othersDisplay.classList.add('other-starters');
            othersDisplay.classList.add('result');
            othersDisplay.textContent = 'Other ' + natureScoreList[0].nature + ' starters' + genderSymbol + ': ';

            for(let i = 0; i < otherStarters.length; i++) {
                if(!otherStarters[i].hasOwnProperty(natureScoreList[0].nature)) {
                    continue;
                }

                for(let j = 0; j < possibleGenders.length; j++) {

                    let possibleStarter = otherStarters[i][natureScoreList[0].nature][possibleGenders[j]];
                    if(!includedStarters.includes(possibleStarter)) {
                        includedStarters.push(possibleStarter);
                        othersDisplay.appendChild(createImg(possibleStarter));
                    }
                }
            }
            
            if(includedStarters.length > 1) {
                main.insertBefore(othersDisplay, document.querySelector('.answer-list'));
            }
        }

        // Show a detailed points breakdown
        var tableContainer = document.createElement('div');
        tableContainer.classList.add('table-container');
        tableContainer.classList.add('result');

        var pointsTable = document.createElement('table');

        var tableTitle = document.createElement('caption');
        tableTitle.textContent = 'Detailed Points Breakdown';
        pointsTable.appendChild(tableTitle);

        for(let n = 0; n < natureScoreList.length; n++) {
            let row = document.createElement('tr');
            let natureCol = document.createElement('td');
            natureCol.textContent = natureScoreList[n].nature;
            row.appendChild(natureCol);

            let pointsCol = document.createElement('td');
            let natureScore = scoresByGame.all[natureScoreList[n].nature];
            pointsCol.textContent = natureScore.userPoints + '/' + natureScore.totalPoints + ' points possible';
            if(pointsCol.textContent[0] === '1') {
                pointsCol.style.paddingLeft = '0.9em';  // Hard coded correction for the space in front of "1" in the Wonder Mail font 
            }
            row.appendChild(pointsCol);

            pointsTable.appendChild(row);
        }

        tableContainer.appendChild(pointsTable)
        main.appendChild(tableContainer);
    }
}

// Start a fresh quiz once loading is complete
Promise.all([
    setupQuestionsLoaded,
    mainQuestionsLoaded,
    finalQuestionsLoaded,
    pmd1QuestionsLoaded,
    pmd2DescriptionsLoaded,
    pmd1StartersLoaded,
    pmd2TDStartersLoaded,
    pmd2SStartersLoaded])
.then(
    function(_) {
        performSetup();
        restartQuiz();
    }
);
