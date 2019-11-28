const keys = require('./keys');

// Express
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgress
const { Pool } = require('pg');
const pgClient =new Pool({
    host: keys.pgHost,
    port: keys.pgPort,
    user: keys.pgUser,
    password: keys.pgPassword,
    database: keys.pgDatabase
});
pgClient.on('error', () => console.log('Lost DB connection'));

pgClient.query('CREATE TABLE IF NOT EXISTS values(number INT)')
    .catch((err) => console.log(err));

// Redis
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req,res) => {
    res.send('Fibbonanci Calculator');    
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40 || parseInt(index) < 0) {
        return res.status(422).send('Index out of range');
    } 
    redisClient.hset('values', index, 'Empty');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    res.send({working: true});
});

app.listen(5000, err => {
    console.log('Listening');
});