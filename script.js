// Enhanced JavaScript for HP Quiz with timing and ranking system

// Quiz configuration
const CORRECT_ANSWERS = {
    question1: ['paper jam', 'paperjam', 'jam', 'paper stuck'],
    question2: ['print head', 'printhead', 'head', 'printer head'],
    question3: ['printer setup', 'setup', 'installation', 'printer installation', 'configure', 'configuration'],
    question4: ['instant ink', 'instantink', 'instant', 'ink subscription', 'subscription service'],
    question5: ['data product', 'dataproduct', 'data analytics', 'analytics product', 'data solution'],
    question6: ['root cause analysis', 'rootcauseanalysis', 'rca', 'root cause', 'cause analysis'],
    question7: ['telemetry', 'remote monitoring', 'data transmission', 'remote data', 'monitoring']
};

// Timing variables
let quizStartTime = null;
let questionStartTimes = {};
let totalTimeSpent = 0;
let timerInterval = null;
let quizStarted = false;
let quizSubmitted = false;

// Initialize quiz timing when user starts interacting with form
function initializeQuizTiming() {
    if (!quizStarted) {
        quizStartTime = new Date();
        questionStartTimes[1] = new Date();
        quizStarted = true;
        console.log('Quiz started at:', quizStartTime);
        
        // Start timer updates
        timerInterval = setInterval(updateTimingDisplay, 1000);
        updateTimingDisplay(); // Show immediately
    }
}

// Function to show/hide questions with timing
function showQuestion(questionNumber) {
    // Initialize timing if not already started
    if (!quizStarted) {
        initializeQuizTiming();
    }
    
    // Record time spent on current question
    const currentTime = new Date();
    const currentQuestion = getCurrentVisibleQuestion();
    
    if (currentQuestion && questionStartTimes[currentQuestion]) {
        const timeSpent = currentTime - questionStartTimes[currentQuestion];
        console.log(`Time spent on question ${currentQuestion}: ${timeSpent}ms`);
    }
    
    // Hide all questions
    for (let i = 1; i <= 7; i++) {
        document.getElementById('question' + i).style.display = 'none';
    }
    
    // Show the selected question
    document.getElementById('question' + questionNumber).style.display = 'block';
    
    // Record start time for new question
    questionStartTimes[questionNumber] = new Date();
}

// Get currently visible question number
function getCurrentVisibleQuestion() {
    for (let i = 1; i <= 7; i++) {
        const question = document.getElementById('question' + i);
        if (question && question.style.display !== 'none') {
            return i;
        }
    }
    return 1; // Default to first question
}

// Update timing display
function updateTimingDisplay() {
    if (!quizStartTime || quizSubmitted) return;
    
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - quizStartTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    
    // Create or update timer display
    let timerDiv = document.getElementById('quiz-timer');
    if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'quiz-timer';
        timerDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(100, 127, 188, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(100, 127, 188, 0.3);
            backdrop-filter: blur(10px);
            z-index: 1000;
        `;
        document.body.appendChild(timerDiv);
    }
    
    timerDiv.innerHTML = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Validate answers
function validateAnswers(userAnswers) {
    const results = {
        correct: 0,
        total: 7,
        details: {}
    };
    
    for (const [question, userAnswer] of Object.entries(userAnswers)) {
        const correctAnswers = CORRECT_ANSWERS[question];
        const isCorrect = correctAnswers.some(correct => 
            userAnswer.toLowerCase().trim() === correct.toLowerCase()
        );
        
        results.details[question] = {
            userAnswer: userAnswer,
            isCorrect: isCorrect,
            correctAnswers: correctAnswers
        };
        
        if (isCorrect) {
            results.correct++;
        }
    }
    
    return results;
}

// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('quiz-form');
    
    if (form) {
        // Add event listeners to form inputs to start timer when user begins
        const formInputs = form.querySelectorAll('input, select');
        formInputs.forEach(input => {
            input.addEventListener('focus', function() {
                if (!quizStarted) {
                    initializeQuizTiming();
                }
            });
            
            input.addEventListener('input', function() {
                if (!quizStarted) {
                    initializeQuizTiming();
                }
            });
        });
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Set submission flag to prevent timer updates
            quizSubmitted = true;
            
            // Stop timer immediately when submit is clicked
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // Remove timer display immediately and ensure it's completely hidden
            const timerDiv = document.getElementById('quiz-timer');
            if (timerDiv) {
                timerDiv.style.display = 'none';
                timerDiv.remove();
            }
            
            // Also try to remove any lingering timer elements
            const allTimers = document.querySelectorAll('[id*="timer"], .timer, .quiz-timer');
            allTimers.forEach(timer => {
                timer.style.display = 'none';
                timer.remove();
            });
            
            // Calculate total completion time
            const completionTime = new Date();
            const totalTimeMs = quizStartTime ? completionTime - quizStartTime : 0;
            const totalTimeSeconds = Math.floor(totalTimeMs / 1000);
            
            // Collect form data
            const userAnswers = {
                question1: document.getElementById('answer1').value,
                question2: document.getElementById('answer2').value,
                question3: document.getElementById('answer3').value,
                question4: document.getElementById('answer4').value,
                question5: document.getElementById('answer5').value,
                question6: document.getElementById('answer6').value,
                question7: document.getElementById('answer7').value
            };
            
            // Validate answers
            const validation = validateAnswers(userAnswers);
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                answers: userAnswers,
                validation: validation,
                timing: {
                    startTime: quizStartTime,
                    completionTime: completionTime,
                    totalTimeMs: totalTimeMs,
                    totalTimeSeconds: totalTimeSeconds,
                    questionTimes: questionStartTimes
                },
                timestamp: completionTime,
                score: validation.correct,
                isAllCorrect: validation.correct === 7,
                isEligibleForRanking: validation.correct === 7 // Only perfect scores are ranked
                // Note: The server now filters to include only the first successful attempt per email
            };
            
            // Submit to MongoDB
            submitToMongoDB(formData);
        });
    }
});

// MongoDB submission function with ranking
async function submitToMongoDB(data) {
    const resultDiv = document.getElementById('result-message');
    resultDiv.innerHTML = 'Submitting your answers...';
    
    try {
        const response = await fetch('/submit-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Add the server response about ranking to data for display
            if (result.ranking) {
                data.isFirstPerfectScore = result.ranking.isFirstPerfectScore;
            }
            
            // Timer was already stopped and removed in form submission
            // Display results with score and timing
            displayResults(data, result);
            
            // Reset quiz state
            quizStarted = false;
            quizStartTime = null;
            questionStartTimes = {};
            
            // Clear form
            document.getElementById('quiz-form').reset();
            showQuestion(1); // Reset to first question
            
            // Enable leaderboard display
            leaderboardEnabled = true;
            
            // Automatically show leaderboard after results
            setTimeout(() => {
                fetchLeaderboard();
                // Scroll to leaderboard section
                setTimeout(() => {
                    const leaderboardSection = document.getElementById('leaderboard-section');
                    if (leaderboardSection) {
                        leaderboardSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }
                }, 500); // Small delay to ensure leaderboard is rendered
            }, 1000); // 1 second delay after showing results
        } else {
            throw new Error('Failed to submit');
        }
    } catch (error) {
        console.error('Error:', error);
        resultDiv.className = 'error';
        resultDiv.innerHTML = 'Error submitting quiz. Please try again.';
    }
}

// Display comprehensive results
function displayResults(submissionData, serverResponse) {
    const resultDiv = document.getElementById('result-message');
    const { validation, timing, name, isAllCorrect } = submissionData;
    
    let resultHTML = `
        <div style="background: rgba(255, 255, 255, 0.9); border-radius: 20px; padding: 30px; margin: 20px 0; backdrop-filter: blur(10px); box-shadow: 0 8px 25px rgba(100, 127, 188, 0.3);">
            <h3 style="color: #647FBC; text-align: center; margin-bottom: 25px;">
                <i class="fas fa-trophy"></i> Quiz Results for ${name}
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div style="text-align: center; padding: 15px; background: rgba(174, 214, 207, 0.3); border-radius: 15px;">
                    <div style="font-size: 2rem; color: #647FBC;">⏱️</div>
                    <div style="font-weight: 600; color: #333;">Completion Time</div>
                    <div style="font-size: 1.2rem; color: #647FBC;">${Math.floor(timing.totalTimeSeconds / 60)}:${(timing.totalTimeSeconds % 60).toString().padStart(2, '0')}</div>
                </div>
                
                <div style="text-align: center; padding: 15px; background: rgba(145, 173, 200, 0.3); border-radius: 15px;">
                    <div style="font-size: 2rem; color: #647FBC;">📊</div>
                    <div style="font-weight: 600; color: #333;">Score</div>
                    <div style="font-size: 1.2rem; color: #647FBC;">${validation.correct} / ${validation.total}</div>
                </div>
                
                <div style="text-align: center; padding: 15px; background: rgba(174, 214, 207, 0.3); border-radius: 15px;">
                    <div style="font-size: 2rem;">${isAllCorrect ? '🏆' : '📝'}</div>
                    <div style="font-weight: 600; color: #333;">Status</div>
                    <div style="font-size: 1rem; color: ${isAllCorrect ? '#28a745' : '#ffc107'}; font-weight: 600;">
                        ${isAllCorrect ? 'Perfect Score!' : 'Good Effort!'}
                    </div>
                </div>
            </div>
    `;
    
    // Add detailed answer breakdown
    /* Commented out - no need to show answer breakdown to users
    resultHTML += `
        <h4 style="color: #647FBC; margin: 20px 0 15px 0;">Answer Breakdown:</h4>
        <div style="margin-bottom: 25px;">
    `;
    
    for (const [question, details] of Object.entries(validation.details)) {
        const questionNum = question.replace('question', '');
        const statusIcon = details.isCorrect ? '✅' : '❌';
        const statusColor = details.isCorrect ? '#28a745' : '#dc3545';
        
        resultHTML += `
            <div style="margin: 10px 0; padding: 15px; background: rgba(255, 255, 255, 0.5); border-radius: 10px; border-left: 4px solid ${statusColor};">
                <strong>Question ${questionNum}:</strong> ${statusIcon} 
                <span style="color: ${statusColor}; font-weight: 600;">
                    ${details.isCorrect ? 'Correct' : 'Incorrect'}
                </span><br>
                <small style="color: #666;">
                    Your answer: "${details.userAnswer}"
                    ${!details.isCorrect ? `<br>Correct answers: ${details.correctAnswers.join(', ')}` : ''}
                </small>
            </div>
        `;
    }
    
    resultHTML += '</div>';
    */
    
    // Add ranking information
    if (isAllCorrect) {
        // Check if this is the user's first perfect score
        let isFirstAttempt = true;
        if (submissionData.isFirstPerfectScore === false) {
            isFirstAttempt = false;
        }
        
        if (isFirstAttempt) {
            resultHTML += `
                <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 20px; border-radius: 15px; text-align: center; color: #333; font-weight: 600;">
                    <div style="font-size: 1.5rem; margin-bottom: 10px;">🏆 PERFECT SCORE ACHIEVED! 🏆</div>
                    <div>Your first perfect score attempt is eligible for the leaderboard! Check the updated rankings below.</div>
                    <div style="margin-top: 10px; font-size: 0.9rem;">Rankings are based on fastest completion time with all correct answers (first attempt only).</div>
                </div>
            `;
        } else {
            resultHTML += `
                <div style="background: linear-gradient(135deg, #6c757d, #495057); padding: 20px; border-radius: 15px; text-align: center; color: white; font-weight: 600;">
                    <div style="font-size: 1.5rem; margin-bottom: 10px;">🌟 PERFECT SCORE AGAIN! 🌟</div>
                    <div>Great job on another perfect score! Your first successful attempt is already on the leaderboard.</div>
                    <div style="margin-top: 10px; font-size: 0.9rem;">Only your first perfect score is eligible for the leaderboard rankings.</div>
                </div>
            `;
        }
    } else {
        resultHTML += `
            <div style="background: rgba(145, 173, 200, 0.3); padding: 20px; border-radius: 15px; text-align: center; color: #333;">
                <div style="font-size: 1.2rem; margin-bottom: 10px;">📚 Keep Learning!</div>
                <div>To appear on the leaderboard, you need all 7 answers correct. Try again to improve your score!</div>
                <div style="margin-top: 10px; font-size: 0.9rem;">Check the leaderboard below to see current top performers.</div>
            </div>
        `;
    }
    
    resultHTML += '</div>';
    
    resultDiv.className = isAllCorrect ? 'success' : 'partial-success';
    resultDiv.innerHTML = resultHTML;
}

// Function to fetch and display leaderboard
async function fetchLeaderboard() {
    // Only fetch and display leaderboard if it's enabled (after quiz submission)
    if (!leaderboardEnabled) {
        return;
    }
    
    try {
        const response = await fetch('/leaderboard');
        if (response.ok) {
            const leaderboard = await response.json();
            displayLeaderboard(leaderboard);
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

// Display leaderboard
function displayLeaderboard(leaderboard) {
    const container = document.querySelector('.container');
    
    let leaderboardHTML = `
        <div id="leaderboard-display" style="background: rgba(255, 255, 255, 0.9); border-radius: 20px; padding: 30px; margin: 30px 0; backdrop-filter: blur(10px); box-shadow: 0 8px 25px rgba(100, 127, 188, 0.3);">
            <h3 style="color: #647FBC; text-align: center; margin-bottom: 25px;">
                <i class="fas fa-trophy"></i> Top 3 Performers Leaderboard
            </h3>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">
                Fastest completion times with perfect scores - first successful attempt only
            </p>
    `;
    
    if (leaderboard.length === 0) {
        leaderboardHTML += `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 20px; color: #AED6CF;"></i>
                <div>No perfect scores yet. Be the first to make it to the leaderboard!</div>
            </div>
        `;
    } else {
        // Limit to top 3 performers only
        const top3 = leaderboard.slice(0, 3);
        
        top3.forEach((entry, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const timeDisplay = `${Math.floor(entry.timing.totalTimeSeconds / 60)}:${(entry.timing.totalTimeSeconds % 60).toString().padStart(2, '0')}`;
            
            leaderboardHTML += `
                <div style="display: flex; align-items: center; padding: 15px; margin: 10px 0; background: rgba(174, 214, 207, 0.2); border-radius: 15px; border-left: 4px solid #647FBC;">
                    <div style="font-size: 1.5rem; margin-right: 15px; min-width: 40px;">${medal}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #333;">${entry.name}</div>
                       
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: #647FBC;">${timeDisplay}</div>
                        <div style="color: #666; font-size: 0.8rem;">Perfect Score</div>
                    </div>
                </div>
            `;
        });
        
        // Add note if there are more than 3 entries
        if (leaderboard.length > 3) {
            leaderboardHTML += `
                <div style="text-align: center; padding: 15px; margin-top: 20px; color: #666; font-style: italic;">
                    <i class="fas fa-star"></i> Showing top 3 performers only
                    <br><small>Total ${leaderboard.length} perfect scores achieved!</small>
                </div>
            `;
        }
    }
    
    leaderboardHTML += '</div>';
    
    // Add leaderboard to page
    const existingLeaderboard = document.getElementById('leaderboard-section');
    if (existingLeaderboard) {
        existingLeaderboard.innerHTML = leaderboardHTML;
    } else {
        const leaderboardDiv = document.createElement('div');
        leaderboardDiv.id = 'leaderboard-section';
        leaderboardDiv.innerHTML = leaderboardHTML;
        container.appendChild(leaderboardDiv);
    }
}

// Track if leaderboard should be shown
let leaderboardEnabled = false;

// Auto-fetch leaderboard every 30 seconds (only if enabled)
setInterval(() => {
    if (leaderboardEnabled) {
        fetchLeaderboard();
    }
}, 30000);

// Remove automatic leaderboard fetch on page load
// The leaderboard will only show after quiz submission
document.addEventListener('DOMContentLoaded', function() {
    // Initialize carousel and other page functionality
    // But do NOT fetch leaderboard automatically
});

// ==============================
// CAROUSEL FUNCTIONALITY
// ==============================

let currentSlideIndex = 0;
const slides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.indicator');
let autoSlideInterval;

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeCarousel();
});

function initializeCarousel() {
    // Start auto-slide
    startAutoSlide();
    
    // Pause auto-slide on hover
    const carouselContainer = document.querySelector('.carousel-container');
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
    }
}

function showSlide(index) {
    if (!slides.length) return;
    
    // Hide all slides
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Ensure index is within bounds
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }
    
    // Show current slide
    if (slides[currentSlideIndex]) {
        slides[currentSlideIndex].classList.add('active');
    }
    if (indicators[currentSlideIndex]) {
        indicators[currentSlideIndex].classList.add('active');
    }
}

function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

function prevSlide() {
    showSlide(currentSlideIndex - 1);
}

function currentSlide(index) {
    showSlide(index - 1); // Convert to 0-based index
}

function startAutoSlide() {
    stopAutoSlide(); // Clear any existing interval
    autoSlideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
}

function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

// Keyboard navigation for carousel
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        prevSlide();
    } else if (e.key === 'ArrowRight') {
        nextSlide();
    }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            nextSlide(); // Swipe left
        } else {
            prevSlide(); // Swipe right
        }
    }
}
