const crypto = require("crypto");

const surveys = [
    {
        id: "online-shopping",
        theme: "violet",
        eyebrow: "Retail experience study",
        title: "Your online shopping experience",
        intro: "Tell us how you browse, buy, and evaluate products online.",
        habitsTitle: "Shopping habits",
        habitsDescription: "Choose the option that best describes how you shop.",
        contextQuestion: "What matters most when you shop online?",
        contextOptions: ["Convenience", "Lower prices", "Product variety", "Fast delivery"],
        frequencyQuestion: "How often do you buy something online?",
        frequencyOptions: ["Every week", "Every month", "A few times a year", "Rarely"],
        channelQuestion: "Which device do you primarily use for online shopping?",
        channelOptions: ["Mobile phone", "Laptop / desktop", "Tablet"],
        experienceDescription: "Rate your recent online shopping experience.",
        satisfactionQuestion: "Overall, how satisfied are you with online shopping?",
        recommendationQuestion: "How likely are you to recommend online shopping to a friend?",
        feedbackQuestion: "What would most improve your online shopping experience?",
        qualityAnswer: "slightly-disagree"
    },
    {
        id: "food-delivery",
        theme: "orange",
        eyebrow: "Food delivery study",
        title: "Your food delivery experience",
        intro: "Share how you choose restaurants, place orders, and receive food.",
        habitsTitle: "Ordering habits",
        habitsDescription: "Tell us about your usual food delivery routine.",
        contextQuestion: "When do you most often order food delivery?",
        contextOptions: ["Lunch", "Dinner", "Weekends", "Late night"],
        frequencyQuestion: "How often do you order through a delivery app?",
        frequencyOptions: ["Several times a week", "Once a week", "A few times a month", "Rarely"],
        channelQuestion: "How do you normally place an order?",
        channelOptions: ["Mobile app", "Mobile website", "Laptop / desktop"],
        experienceDescription: "Think about your most recent food delivery order.",
        satisfactionQuestion: "How satisfied are you with food delivery services overall?",
        recommendationQuestion: "How likely are you to recommend your preferred delivery service?",
        feedbackQuestion: "What is the one thing food delivery services should improve?",
        qualityAnswer: "slightly-disagree"
    },
    {
        id: "streaming-entertainment",
        theme: "rose",
        eyebrow: "Entertainment study",
        title: "Your streaming experience",
        intro: "Tell us what you watch and how streaming fits into your routine.",
        habitsTitle: "Viewing habits",
        habitsDescription: "Choose the answers closest to your normal viewing behaviour.",
        contextQuestion: "What type of content do you watch most often?",
        contextOptions: ["Movies", "TV series", "Live sports", "Documentaries"],
        frequencyQuestion: "How often do you use a streaming service?",
        frequencyOptions: ["Every day", "A few days a week", "A few times a month", "Rarely"],
        channelQuestion: "Which screen do you use most for streaming?",
        channelOptions: ["Smart TV", "Mobile / tablet", "Laptop / desktop"],
        experienceDescription: "Rate the streaming services you currently use.",
        satisfactionQuestion: "Overall, how satisfied are you with streaming services?",
        recommendationQuestion: "How likely are you to recommend your favourite streaming service?",
        feedbackQuestion: "What would make your streaming experience better?",
        qualityAnswer: "slightly-disagree"
    },
    {
        id: "digital-banking",
        theme: "blue",
        eyebrow: "Financial services study",
        title: "Your digital banking experience",
        intro: "Share how you use digital banking and what builds your trust.",
        habitsTitle: "Banking habits",
        habitsDescription: "Think about the digital banking service you use most.",
        contextQuestion: "What do you use digital banking for most often?",
        contextOptions: ["Payments", "Money transfers", "Savings", "Paying bills"],
        frequencyQuestion: "How often do you access digital banking?",
        frequencyOptions: ["Several times a day", "A few times a week", "A few times a month", "Rarely"],
        channelQuestion: "Which banking channel do you prefer?",
        channelOptions: ["Mobile app", "Bank website", "ATM / kiosk"],
        experienceDescription: "Rate the reliability and ease of your banking experience.",
        satisfactionQuestion: "Overall, how satisfied are you with digital banking?",
        recommendationQuestion: "How likely are you to recommend your bank's digital services?",
        feedbackQuestion: "What would make digital banking feel easier or safer?",
        qualityAnswer: "slightly-disagree"
    },
    {
        id: "travel-booking",
        theme: "teal",
        eyebrow: "Travel planning study",
        title: "Your travel booking experience",
        intro: "Tell us how you research, compare, and book your trips.",
        habitsTitle: "Travel habits",
        habitsDescription: "Choose the answers that best match your travel planning.",
        contextQuestion: "What type of trip do you book most often?",
        contextOptions: ["Leisure holiday", "Business travel", "Family visit", "Short break"],
        frequencyQuestion: "How often do you book travel?",
        frequencyOptions: ["Every month", "Every few months", "Once or twice a year", "Less often"],
        channelQuestion: "Where do you normally complete a booking?",
        channelOptions: ["Travel app", "Travel website", "Agent / phone"],
        experienceDescription: "Think about your most recent travel booking.",
        satisfactionQuestion: "Overall, how satisfied are you with booking travel?",
        recommendationQuestion: "How likely are you to recommend your preferred booking service?",
        feedbackQuestion: "What would most improve the travel booking process?",
        qualityAnswer: "slightly-disagree"
    }
];

function getSurveyById(id) {
    return surveys.find((survey) => survey.id === id) || null;
}

function getRandomSurvey() {
    return surveys[crypto.randomInt(0, surveys.length)];
}

function getAllSurveys() {
    return surveys.map((survey) => ({ ...survey }));
}

module.exports = { getAllSurveys, getRandomSurvey, getSurveyById };
