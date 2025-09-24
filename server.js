// Simple MongoDB server for HP Quiz
require('dotenv').config(); // Load environment variables
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection using environment variables
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || 'hp_quiz';
const collectionName = process.env.COLLECTION_NAME || 'quiz_responses';

if (!uri) {
    console.error('MONGO_URI environment variable is required');
    process.exit(1);
}

const client = new MongoClient(uri);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Connect to MongoDB
async function connectDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");
        console.log(`Using database: ${dbName}, collection: ${collectionName}`);
        return client.db(dbName).collection(collectionName);
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

let collection;
connectDB().then(coll => {
    collection = coll;
});

// Route to submit quiz with ranking logic
app.post('/submit-quiz', async (req, res) => {
    try {
        const quizData = req.body;
        quizData.submittedAt = new Date();
        
        // Insert the quiz response
        const result = await collection.insertOne(quizData);
        
        // If perfect score, update ranking
        let rankingInfo = null;
        if (quizData.isEligibleForRanking) {
            rankingInfo = await updateRanking(quizData);
        }
        
        res.json({
            success: true,
            message: "Quiz submitted successfully!",
            id: result.insertedId,
            ranking: rankingInfo,
            score: quizData.score,
            isAllCorrect: quizData.isAllCorrect,
            completionTime: quizData.timing.totalTimeSeconds
        });
        
        console.log("Quiz submitted:", quizData.name, quizData.email, 
                   `Score: ${quizData.score}/7`, 
                   `Time: ${quizData.timing.totalTimeSeconds}s`,
                   quizData.isAllCorrect ? "✅ PERFECT" : "❌");
    } catch (error) {
        console.error("Error saving quiz:", error);
        res.status(500).json({
            success: false,
            message: "Failed to save quiz"
        });
    }
});

// Route to get leaderboard
app.get('/leaderboard', async (req, res) => {
    try {
        // First get all eligible entries with perfect scores
        const allEntries = await collection.find({
            isEligibleForRanking: true,
            score: 7
        })
        .sort({ 'timing.totalTimeSeconds': 1, 'submittedAt': 1 }) // Sort by fastest time, then earliest submission
        .project({
            name: 1,
            email: 1,
            timing: 1,
            score: 1,
            submittedAt: 1
        })
        .toArray();
        
        // Filter to keep only the first successful attempt for each email
        const uniqueEmails = new Set();
        const leaderboard = allEntries.filter(entry => {
            if (!uniqueEmails.has(entry.email)) {
                uniqueEmails.add(entry.email);
                return true;
            }
            return false;
        })
        .slice(0, 10); // Limit to top 10
        
        res.json(leaderboard);
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch leaderboard"
        });
    }
});

// Function to update ranking for perfect scores
async function updateRanking(quizData) {
    try {
        // Check if this user already has a perfect score entry
        const existingEntry = await collection.findOne({
            email: quizData.email,
            isEligibleForRanking: true,
            score: 7
        });
        
        // If this is not their first perfect score, they won't be added to the leaderboard
        const isFirstPerfectScore = !existingEntry;
        
        // Get unique emails with perfect scores for proper ranking calculation
        const uniqueScores = await collection.aggregate([
            { $match: { isEligibleForRanking: true, score: 7 } },
            { $sort: { 'timing.totalTimeSeconds': 1, submittedAt: 1 } },
            { $group: { _id: "$email", timing: { $first: "$timing" } } }
        ]).toArray();
        
        // Count how many people have faster times with perfect scores (first attempts only)
        let currentRank = 0;
        if (isFirstPerfectScore) {
            const fasterEntries = uniqueScores.filter(entry => 
                entry.timing.totalTimeSeconds < quizData.timing.totalTimeSeconds
            );
            currentRank = fasterEntries.length + 1;
        } else {
            // If not first perfect score, don't calculate rank for leaderboard
            currentRank = -1; // -1 indicates not ranked
        }
        
        return {
            currentRank: currentRank,
            totalPerfectScores: uniqueScores.length + (isFirstPerfectScore ? 1 : 0),
            completionTime: quizData.timing.totalTimeSeconds,
            isFirstPerfectScore: isFirstPerfectScore
        };
    } catch (error) {
        console.error("Error updating ranking:", error);
        return null;
    }
}

// Route to get quiz statistics
app.get('/stats', async (req, res) => {
    try {
        const stats = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    perfectScores: { 
                        $sum: { 
                            $cond: [{ $eq: ["$score", 7] }, 1, 0] 
                        } 
                    },
                    averageScore: { $avg: "$score" },
                    averageTime: { 
                        $avg: "$timing.totalTimeSeconds" 
                    },
                    fastestTime: { 
                        $min: { 
                            $cond: [
                                { $eq: ["$score", 7] }, 
                                "$timing.totalTimeSeconds", 
                                null
                            ] 
                        } 
                    }
                }
            }
        ]).toArray();
        
        res.json(stats[0] || {
            totalSubmissions: 0,
            perfectScores: 0,
            averageScore: 0,
            averageTime: 0,
            fastestTime: null
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics"
        });
    }
});

// Serve the quiz page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'quiz.html'));
});

app.listen(port, () => {
    console.log(`HP Quiz server running on http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Close MongoDB connection on exit
process.on('SIGINT', async () => {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});
