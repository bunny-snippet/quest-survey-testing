const express = require("express");
require("dotenv").config();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
    res.set({
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    });
    next();
});
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));
app.use(express.static("public", { index: false }));
app.set("view engine", "ejs");
app.use("/", require("./routes/pages"));
app.use("/api", require("./routes/api"));

app.use((req, res) => res.status(404).render("error", {
    title: "Page not found",
    message: "The page you requested is not available."
}));
app.use((error, req, res, next) => {
    console.error("Unhandled request error:", error.message);
    if (res.headersSent) return next(error);
    return res.status(500).render("error", {
        title: "Something went wrong",
        message: "Please return to the prescreener and try again."
    });
});

if (require.main === module) {
    const port = Number(process.env.PORT) || 3001;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}
module.exports = app;
