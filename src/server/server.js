const express = require("express");
const mysql = require("mysql");
const util = require("util");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const {check, validationResult} = require("express-validator");

const app = express();
app.use(cors());
let urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

let dbconfig = require("./database");
const connection = mysql.createConnection(dbconfig);
connection.connect(function (e) {
    if (e) throw e;
    console.log("Connected to MySQL!");
});

function getDate() {
    let date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getUTCFullYear();
    return year + "-" + month + "-" + day;
}

const query = util.promisify(connection.query).bind(connection);

app.post("/api/get-notes", urlencodedParser, function (req, res) {
    const accessToken = req.body.accessToken;
    jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            res.status(403).send("Verification unsuccessful.");
        } else {
            this.decoded = decoded;

            const id = decoded.id;

            const sqlQuery = "SELECT * FROM notes WHERE user_id = ?";
            let results = await query(sqlQuery, [id]);
            res.status(200).send(results);
        }
    });
});

app.post("/api/create-note", urlencodedParser,
    check("title").isLength({min: 1, max: 100}).withMessage("Invalid title. Title must be between 1-100 characters."),
    check("note_content").isLength({min: 1, max: 10000}).withMessage("Invalid note content. Content must be between 1-10000 characters."),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const sqlQuery = "INSERT INTO notes (user_id, title, note_content, date_created, date_modified) values (?,?,?,?,?)";

        const accessToken = req.body.accessToken;

        const title = req.body.title;
        const note_content = req.body.note_content;
        const date_created = new Date();
        const date_modified = new Date();

        jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                res.status(403).send("Verification unsuccessful.");
            } else {
                this.decoded = decoded;

                const user_id = decoded.id;

                await query(sqlQuery, [user_id, title, note_content, date_created, date_modified]);
                res.status(200).send("New note saved successfully.")
            }
        });
    }
);

app.post("/api/delete-note", urlencodedParser,
    check("note_id").isNumeric(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const accessToken = req.body.accessToken;

        const sqlQuery = "DELETE FROM notes WHERE id=?";

        const note_id = req.body.note_id;

        jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                res.status(403).send("Verification unsuccessful.");
            } else {
                this.decoded = decoded;

                await query(sqlQuery, [note_id]);
                res.status(200).send("Note deleted successfully.");
            }
        });
    });

app.post("/api/edit-note", urlencodedParser,
    check("note_title").isLength({min: 1, max: 100}).withMessage("Title is invalid. Title must be between 1-100 characters."),
    check("note_content").isLength({min: 1, max: 10000}).withMessage("Note content is invalid. Content must be between 1-10000 characters."),
    check("note_id").isNumeric(),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const accessToken = req.body.accessToken;

        const sqlQuery = "UPDATE notes SET title = ?, note_content = ?, date_modified = ? WHERE id = ?";

        const note_title = req.body.note_title;
        const note_content = req.body.note_content;
        const note_date_modified = getDate();
        const note_id = req.body.note_id;

        jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                res.status(403).send("Verification unsuccessful.");
            } else {
                this.decoded = decoded;

                await query(sqlQuery, [note_title, note_content, note_date_modified, note_id]);

                res.status(200).send("Note edited successfully.");
            }
        });
    });

app.post("/api/register", urlencodedParser,
    check("email").isEmail().withMessage("Invalid email."),
    check("password").isLength({min: 8, max: 500}).withMessage("Password must be between 8-500 characters."),
    check("username").isLength({min: 1, max: 50}).withMessage("Invalid username."),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const sqlQuery1 = "SELECT * FROM user WHERE email = ?";
        const sqlQuery2 = "INSERT INTO user (email, password, username) values (?,?,?)";

        const email = req.body.email;
        const password = req.body.password;
        const username = req.body.username;

        const users = await query(sqlQuery1, [email]);
        if (!users.length) {
            const saltRounds = 10;
            await bcrypt.genSalt(saltRounds, async function (err, salt) {
                await bcrypt.hash(password, salt, async function (err, hash) {
                    await query(sqlQuery2, [email, hash, username]);
                });
            });

            let result;
            while (true) {
                result = await query(sqlQuery1, [email]);
                if (result.length) break;
            }

            const user = {
                id: result[0].id,
                email: result[0].email,
                username: result[0].username
            }
            const accessToken = jwt.sign(user, process.env.JWT_SECRET);
            res.status(201).json({"accessToken": accessToken});
        } else {
            res.status(400).send("Email already in use");
        }

    });

app.post("/api/login", urlencodedParser,
    check("email").isEmail().withMessage("Invalid email."),
    check("password").isLength({
        min: 8,
        max: 500
    }).withMessage("Invalid password. Passwords are between 8-500 characters."),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const sqlQuery = "SELECT * FROM user WHERE email = ?";

        const email = req.body.email;
        const password = req.body.password;

        const result = await query(sqlQuery, [email]);
        if (result.length > 0) {
            const match = await bcrypt.compare(password, result[0].password);

            if (match) {
                const user = {
                    id: result[0].id,
                    email: result[0].email,
                    username: result[0].username
                }
                const accessToken = jwt.sign(user, process.env.JWT_SECRET);
                res.status(201).json({"accessToken": accessToken});
            } else {
                res.status(400).send("Incorrect password.");
            }

        } else {
            res.status(400).send("Email not found.");
        }
    });

app.post("/api/verify-login-status", urlencodedParser,
    (req, res) => {
        const accessToken = req.body.accessToken;
        jwt.verify(accessToken, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                res.status(403).send("Verification unsuccessful.");
            } else {
                this.decoded = decoded;

                const id = decoded.id;
                const email = decoded.email;
                const username = decoded.username;

                res.status(202).json({"id": id, "email": email, "username": username});
            }
        });
    });

app.post("/api/delete-account", urlencodedParser,
    check("password").isLength({
        min: 8,
        max: 500
    }).withMessage("Incorrect password. Passwords are between 8-500 characters."),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const accessToken = req.body.accessToken;
        const password = req.body.password;

        jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                res.status(403).send("Verification unsuccessful.");
            } else {
                this.decoded = decoded;

                const sqlQuery1 = "SELECT * FROM user WHERE id = ?";
                const result = await query(sqlQuery1, [decoded.id]);

                const match = await bcrypt.compare(password, result[0].password);
                if (match) {
                    const sqlQuery2 = "DELETE FROM user WHERE id = ?";
                    await query(sqlQuery2, [decoded.id]);

                    const sqlQuery3 = "DELETE FROM notes WHERE user_id = ?";
                    await query(sqlQuery3, [decoded.id]);

                    res.status(200).send("Account deleted successfully.");
                } else {
                    res.status(403).send("Incorrect password.");
                }
            }
        });
    });

app.post("/api/change-password", urlencodedParser,
    check("password").isLength({
        min: 8,
        max: 500
    }).withMessage("Incorrect password. Passwords are between 8-500 characters"),
    check("newPassword").isLength({
        min: 8,
        max: 500
    }).withMessage("New password is not valid. Passwords must be between 8-500 characters."),
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array()});
        }

        const accessToken = req.body.accessToken;
        const password = req.body.password;
        const newPassword = req.body.newPassword;

        jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                res.status(403).send("Verification unsuccessful.");
            } else {
                this.decoded = decoded;

                const sqlQuery1 = "SELECT * FROM user WHERE id = ?";
                const result = await query(sqlQuery1, [decoded.id]);

                const match = await bcrypt.compare(password, result[0].password);
                if (match) {
                    const saltRounds = 10;
                    await bcrypt.genSalt(saltRounds, async function (err, salt) {
                        await bcrypt.hash(newPassword, salt, async function (err, hash) {
                            const sqlQuery2 = "UPDATE user SET password = ? WHERE id = ?";
                            await query(sqlQuery2, [hash, decoded.id]);
                        });
                    });

                    res.status(200).send("Password changed successfully.");
                } else {
                    res.status(403).send("Incorrect password.");
                }
            }
        });
    });

app.listen(8080, () => {
    console.log("Listening at http://localhost:8080/");
});