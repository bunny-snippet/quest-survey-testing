const router = require("express").Router();
const securityController = require("../controllers/securityController");
router.post("/check-risk", securityController.checkRisk);
module.exports = router;