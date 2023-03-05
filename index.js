const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const fs = require("fs");

const schema = require("./models/hostSchema");

require("dotenv").config();

const port = process.env.port || 3000;

// Parse body of incoming requests
app.use(bodyParser.json());

// Connect to Database
const database = require("./util/database");
database();

// Create or update a host
app.post("/api/domains", (req, res) => {
    const apiKey = req.get("X-API-Key");

    if(!apiKey) return res.status(401).send({ "error": "NO_API_KEY" });
    if(apiKey !== process.env.api_key) return res.status(401).send({ "error": "INVALID_API_KEY" });

    const { host, redirect, redirect_path } = req.body;

    if(!host) return res.status(400).send({ "error": "NO_HOST" });
    if(!redirect) return res.status(400).send({ "error": "NO_REDIRECT" });
    if(!redirect_path) return res.status(400).send({ "error": "NO_REDIRECT_PATH" });

    if(!Boolean(redirect_path)) return res.status(400).send({ "error": "INVALID_REDIRECT_PATH_OPTION" });

    schema.findOne({ host: host }, async (err, data) => {
        if(err) {
            console.log(err);
            return res.status(500);
        }

        if(data) {
            await schema.findOneAndUpdate({ host: host }, {
                redirect: redirect,
                redirect_path: redirect_path
            })

            return res.status(200).json({ "message": "UPDATED_HOST" });
        } else {
            data = new schema({
                host: host,
                redirect: redirect,
                redirect_path: redirect_path
            })

            await data.save();

            return res.status(201).json({ "message": "CREATED_HOST" });
        }
    })
})

// Delete a host
app.delete("/api/domains", (req, res) => {
    const apiKey = req.get("X-API-Key");
    const host = req.get("X-Host");

    if(!apiKey) return res.status(401).send({ "error": "NO_API_KEY" });
    if(apiKey !== process.env.api_key) return res.status(401).send({ "error": "INVALID_API_KEY" });
    if(!host) return res.status(400).send({ "error": "NO_HOST" });

    schema.findOne({ host: host }, async (err, data) => {
        if(err) {
            console.log(err);
            return res.status(500);
        }

        if(data) {
            await data.delete();

            return res.status(204).json({ "message": "DELETED_HOST" });
        } else {
            return res.status(404).json({ "error": "INVALID_HOST" });
        }
    })
})

// Redirect requests
app.use(async (req, res, next) => {
    const host = req.get("host");

    schema.findOne({ host: host }, async (err, data) => {
        if(err) {
            console.log(err);
            return next();
        }

        if(data) {
            if(data.redirect_path) return res.redirect(302, data.redirect + req.url);

            res.redirect(302, data.redirect);
        } else {
            if(req.accepts("html")) {
                let values = fs.readFileSync(__dirname + "/responses/not-setup.html", { encoding: "utf8" });

                values = values.replace("{hostname}", req.hostname);

                return res.send(values);
            }

            return res.status(421).json({ "error": "DOMAIN_NOT_SETUP" });
        }
    })
})

app.listen(port, () => {
    console.log(`Listening on Port: ${port}`);
})