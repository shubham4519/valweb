import mongoose from "mongoose";
import express from "express";
import {
    startSentWatcher,
    startSentWatcher2
} from "./mail-readers.js";
import SentEmail from "./model.js"; // MongoDB model

const app = express();

// Connect MongoDB
const dbUrl = process.env.DB_URI || 'mongodb+srv://valmoDriver1:ClUsTeRAccEssOR@cluster0.zgcwg.mongodb.net/valmobmail';
await mongoose.connect(dbUrl);
console.log("✅ MongoDB Connected");

// Start watcher
// startSentWatcher();
startSentWatcher2();

app.get("/", async (req, res) => {
    try {
        const allMails = await SentEmail.find();
        res.json(allMails);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch emails"
        });
    }
});
app.get("/all-mail", async (req, res) => {
    try {
        const allMails = await SentEmail.find();
        res.json(allMails);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch emails"
        });
    }
});

app.get("/delete", async (req, res) => {
    try {
        const allMails = await SentEmail.deleteMany();
        res.json({
            msg: "successfull"
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch emails"
        });
    }
});


app.get("/total", async (req, res) => {
    try {
        // Only fetch emails that mention "invoice"
        const emails = await SentEmail.find({
            htmlBody: /invoice/i
        }).sort({
            date: -1
        });

        let totalAmount = 0;
        let invoiceDetails = [];

        // Matches: "18,600/-" , "4,250/-", "950/-", "1,20,000/-"
        const amountRegex = /₹?\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+)(?=\/-)/g;

        for (let email of emails) {

            // Prefer cleaned plain text, fallback to HTML if necessary
            const bodyContent = email.textBody && email.textBody.trim().length > 0 ?
                email.textBody :
                (email.htmlBody || "");

            if (!bodyContent) continue;

            let amountsFound = [];
            let match;

            // Find all matching amounts
            while ((match = amountRegex.exec(bodyContent)) !== null) {
                let cleanNumber = match[1].replace(/,/g, "");
                let num = Number(cleanNumber);
                if (!isNaN(num)) {
                    amountsFound.push(num);
                    totalAmount += num;
                }
            }

            invoiceDetails.push({
                subject: email.subject,
                date: email.date,
                to: email.to,
                from: email.from,
                amounts: amountsFound,
                message: bodyContent // instead of returning raw HTML
            });
        }


        res.json({
            success: true,
            totalAmount,
            invoices: invoiceDetails
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.get("/invoices", async (req, res) => {
    try {
        const emails = await SentEmail.find({
            htmlBody: /invoice/i
        }).sort({
            date: -1
        });
        res.json(emails);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));