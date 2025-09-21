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
        // Get top 10 perfect scores ordered by completion time
        const leaderboard = await collection.find({
            isEligibleForRanking: true,
            score: 7
        })
        .sort({ 'timing.totalTimeSeconds': 1 }) // Fastest first
        .limit(10)
        .project({
            name: 1,
            email: 1,
            timing: 1,
            score: 1,
            submittedAt: 1
        })
        .toArray();
        
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
        // Count how many people have faster times with perfect scores
        const fasterCount = await collection.countDocuments({
            isEligibleForRanking: true,
            score: 7,
            'timing.totalTimeSeconds': { $lt: quizData.timing.totalTimeSeconds }
        });
        
        const currentRank = fasterCount + 1;
        
        // Get total number of perfect scores
        const totalPerfectScores = await collection.countDocuments({
            isEligibleForRanking: true,
            score: 7
        });
        
        return {
            currentRank: currentRank,
            totalPerfectScores: totalPerfectScores + 1, // +1 because this submission isn't counted yet
            completionTime: quizData.timing.totalTimeSeconds
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
