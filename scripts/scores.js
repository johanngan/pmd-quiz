// Helpers for tabulating scores for quiz results

// Simple object to hold scores
function Score() {
    this.userPoints = 0;
    this.totalPoints = 0;
}

// Simple object to hold nature scores for different categories
function ScoresByGame() {
    this.all = {};
    this.pmd1 = {};
    this.pmd2TD = {};
    this.pmd2S = {};
}

function addTotalsToTally(scoreTally, toAdd) {
    for(let n in toAdd) {
        if(!scoreTally.hasOwnProperty(n)) {
            scoreTally[n] = new Score();
        }

        scoreTally[n].totalPoints += toAdd[n].totalPoints;
    }
}

// This tallies the maximum number of points per nature per question a user could theoretically earn.
// If the question awards points for a given nature in multiple answers, the maximum point value is added to the total.
function tallySingleResult(question, response, scoreTally) {
    let maxScoresForQuestion = {};
    for(let i = 0; i < question.answers.length; i++) {
        // Recursive case
        if(question.answers[i].hasOwnProperty('subQuestion')) {
            let subTally = {};
            tallySingleResult(question.answers[i].subQuestion, {'points': {}}, subTally);

            for(let n in subTally) {
                if(!maxScoresForQuestion.hasOwnProperty(n)) {
                    maxScoresForQuestion[n] = new Score();
                }
                maxScoresForQuestion[n].totalPoints = Math.max(maxScoresForQuestion[n].totalPoints, subTally[n].totalPoints);
            }
        }

        // Base case
        for(let n in question.answers[i].points) {
            if(!maxScoresForQuestion.hasOwnProperty(n)) {
                maxScoresForQuestion[n] = new Score();
            }
            maxScoresForQuestion[n].totalPoints = Math.max(maxScoresForQuestion[n].totalPoints, question.answers[i].points[n]);
        }
    }
    addTotalsToTally(scoreTally, maxScoresForQuestion);

    for(let n in response.points) {
        scoreTally[n].userPoints += response.points[n];
    }
}

// Tallies points and totals for the quiz
function tallyResults(questions, responses) {
    var results = new ScoresByGame();
    for(let i = 0; i < questions.length; i++) {
        // Across all games
        tallySingleResult(questions[i], responses[i], results.all);

        // PMD1
        if(questions[i].tags.has('PMD1')) {
            tallySingleResult(questions[i], responses[i], results.pmd1);
        }

        // PMD2: TD
        if(questions[i].tags.has('PMD2') && questions[i].tags.has('Time/Darkness')) {
            tallySingleResult(questions[i], responses[i], results.pmd2TD);
        }

        // PMD2: S
        if(questions[i].tags.has('PMD2') && questions[i].tags.has('Sky')) {
            tallySingleResult(questions[i], responses[i], results.pmd2S);
        }
    }

    return results;
}

// Simple object to hold Wilson lower bound scores for different natures
function NatureScore(nature) {
    this.nature = nature;
    this.score_all = null;
    this.score_pmd1 = null;
    this.score_pmd2TD = null;
    this.score_pmd2S = null;
}

// Converts a ScoresByGame object to a list of NatureScore objects, sorted descending by the scoreAll property
function convertToNatureScoreList(scoresByGame) {
    // Calculate each score for each nature
    natureScoreList = [];
    for(let n in scoresByGame.all) {
        var newScore = new NatureScore(n);
        for(let game in scoresByGame) {
            if(scoresByGame[game].hasOwnProperty(n)) {
                newScore["score_" + game] = wilsonLowerBound(
                    scoresByGame[game][n].userPoints, scoresByGame[game][n].totalPoints);
            }
        }

        natureScoreList.push(newScore);
    }

    // Sort descending
    natureScoreList.sort((n1, n2) => n2.score_all - n1.score_all);
    return natureScoreList;
}

// Calculates the Wilson 95% binomial proportion confidence interval lower bound
function wilsonLowerBound(points, total) {
    const z = 1.959964; // 0.025 z-quantile
    var phat = points / total;

    return (phat + z*z/(2*total) - z*Math.sqrt((phat*(1-phat) + z*z/(4*total)) / total)) / (1 + z*z/total)
}

// Selects the game from games with the highest score in natureScore. Ties are broken randomly.
// games should be an array with possible elements "pmd1", "pmd2TD", or "pmd2S"
function selectBestGame(natureScore, games) {
    if(games.length === 0) {
        return null;
    }

    var highest = [games[0]];
    var highScore = natureScore["score_" + games[0]];
    for(let i = 1; i < games.length; i++) {
        var score = natureScore["score_" + games[i]];
        if(highScore === null || score > highScore) {
            highest = [games[i]];
            highScore = score;
        } else if(score === highScore) {
            highest.push(games[i]);
        }
    }

    // Everything is null...
    if(highScore === null) {
        return null;
    }

    return randomArrayElement(highest);
}